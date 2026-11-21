// Wspólna synchronizacja danych konta zapisanych w kolumnie jsonb tabeli profiles (ustawienia, profil ucznia, kolejne).
// Kopia w localStorage działa od razu i bez sieci; konto jest źródłem prawdy po zalogowaniu. Zasady:
// - Każdy zapis niesie znacznik `zapisano` (czas), więc pusty obiekt na koncie to „wyczyszczone celowo”, a brak znacznika to „nigdy nie zapisane”.
// - Lokalne dane trafiają na konto tylko wtedy, gdy są oznaczone jako niezapisane dla tego konta (flaga z id właściciela).
// - Konto czytamy przy pierwszej sesji, po zmianie konta i (najwyżej co minutę) po powrocie do karty, nie przy każdym zdarzeniu logowania.
// - Odpowiedź starsza niż zmiana lokalna nigdy jej nie nadpisuje (numer wersji), a inna karta przeglądarki jest słuchana przez `storage`.
// - Zapisy idą jeden po drugim, pomijają te dla poprzedniego konta, a aktualizacja bez trafionego wiersza nie czyści flagi.
import { useSyncExternalStore } from "react";
import { supabase } from "../supabase";

type Wire = Record<string, unknown>;
type Koperta = { kto: string | null; wire: Wire };

export type Opcje<T> = {
  /** Klucz w localStorage; flaga niezapisanych zmian: `${klucz}.niezapisane`. */
  klucz: string;
  kolumna: "settings" | "learning" | "dashboard";
  domyslne: T;
  /** Z obiektu z konta albo z dysku do wartości (nieznane klucze pomija, braki uzupełnia). */
  zWire: (raw: unknown) => T;
  /** Do obiektu zapisywanego na koncie (bez `zapisano`). */
  doWire: (t: T) => Wire;
  /** Po każdej zmianie stanu (start, zmiana, konto, inna karta). */
  naZmiane?: (t: T) => void;
  /** Co zostaje na tym urządzeniu po wylogowaniu (np. wygląd), reszta wraca do domyślnych. */
  poWylogowaniu?: (t: T) => T;
};

export type Magazyn<T> = {
  biezace: () => T;
  /** Zmiana: od razu na ekranie i lokalnie, na koncie po krótkiej chwili. */
  zmien: (f: (t: T) => T) => void;
  useStan: () => T;
  /** true, gdy ostatni zapis na konto się nie udał. */
  useBlad: () => boolean;
  /** true po pierwszym udanym odczycie konta w tej sesji (wcześniej lokalne dane mogą być nieaktualne). */
  useOdczytano: () => boolean;
  /** Wysyła zaległe zmiany i czeka na koniec zapisów (np. przed wylogowaniem). */
  flush: () => Promise<void>;
  /** Wołane raz przy starcie aplikacji. */
  uruchom: () => void;
};

const jestObiektem = (v: unknown): v is Wire => !!v && typeof v === "object" && !Array.isArray(v);

export function utworzMagazyn<T>(o: Opcje<T>): Magazyn<T> {
  const FLAGA = `${o.klucz}.niezapisane`;
  const sluchacze = new Set<() => void>();
  const powiadom = () => sluchacze.forEach((l) => l());

  let t = o.domyslne;
  let zapisano = 0;
  let blad = false;
  let odczytano = false;
  let wersja = 0;
  let idKonta: string | null = null;
  let kolejka: number | undefined;
  let ponownie: number | undefined;
  let ostatniePobranie = 0;
  let lancuch: Promise<void> = Promise.resolve();
  let uruchomione = false;

  const czasZapisu = (w: Wire) => (typeof w.zapisano === "number" ? w.zapisano : 0);

  // ---- pamięć przeglądarki ----
  function odczytaj(): Koperta | null {
    try {
      const tekst = localStorage.getItem(o.klucz);
      if (!tekst) return null;
      const v: unknown = JSON.parse(tekst);
      if (!jestObiektem(v)) return null;
      // Starszy format: sam obiekt danych, bez właściciela.
      if (jestObiektem(v.wire)) return { kto: typeof v.kto === "string" ? v.kto : null, wire: v.wire };
      return { kto: null, wire: v };
    } catch {
      return null;
    }
  }

  function zapiszLokalnie(wire: Wire, kto: string | null) {
    try {
      localStorage.setItem(o.klucz, JSON.stringify({ kto, wire }));
    } catch {
      // zostaje wartość w pamięci
    }
  }

  const flaga = (): { kto: string | null } | null => {
    try {
      const v = localStorage.getItem(FLAGA);
      if (!v) return null;
      if (v === "1") return { kto: null };
      const p: unknown = JSON.parse(v);
      return jestObiektem(p) ? { kto: typeof p.kto === "string" ? p.kto : null } : { kto: null };
    } catch {
      return null;
    }
  };
  const flagaMoja = (id: string) => {
    const f = flaga();
    return !!f && (f.kto === id || f.kto === null);
  };
  function ustawFlage(tak: boolean, kto: string | null) {
    try {
      if (tak) localStorage.setItem(FLAGA, JSON.stringify({ kto }));
      else localStorage.removeItem(FLAGA);
    } catch {
      // brak storage
    }
  }

  function ustaw(nowe: T, z: number) {
    t = nowe;
    zapisano = z;
    o.naZmiane?.(nowe);
    powiadom();
  }

  // Lokalna kopia zapisana przez inną kartę, nowsza od tego, co mamy w pamięci.
  function przyjmijLokalne() {
    const lok = odczytaj();
    if (!lok || czasZapisu(lok.wire) <= zapisano) return;
    if (lok.kto && idKonta && lok.kto !== idKonta) return;
    ustaw(o.zWire(lok.wire), czasZapisu(lok.wire));
  }

  function wyczysc() {
    window.clearTimeout(kolejka);
    window.clearTimeout(ponownie);
    kolejka = undefined;
    ponownie = undefined;
    wersja++;
    ustawFlage(false, null);
    try {
      localStorage.removeItem(o.klucz);
    } catch {
      // nic do sprzątania
    }
    blad = false;
    odczytano = false;
    ustaw(o.domyslne, 0);
  }

  // ---- zapis na konto ----
  function zapisz(): Promise<void> {
    const id = idKonta;
    if (!id) return lancuch;
    lancuch = lancuch.then(async () => {
      // Zapis zakolejkowany dla poprzedniego konta nie może pójść pod następnym.
      if (idKonta !== id) return;
      const z = zapisano;
      const wire: Wire = { ...o.doWire(t), zapisano: z };
      zapiszLokalnie(wire, id);
      try {
        const { data, error } = await supabase.from("profiles").update({ [o.kolumna]: wire }).eq("id", id).select("id");
        if (error || !data || data.length === 0) throw new Error("zapis");
        // Flagę czyścimy tylko, gdy nic nowszego (z tej ani innej karty) nie czeka.
        const lok = odczytaj();
        if (idKonta === id && (!lok || czasZapisu(lok.wire) <= z)) ustawFlage(false, null);
        if (idKonta === id && blad) {
          blad = false;
          powiadom();
        }
      } catch {
        if (idKonta !== id) return;
        if (!blad) {
          blad = true;
          powiadom();
        }
        window.clearTimeout(ponownie);
        ponownie = window.setTimeout(() => {
          ponownie = undefined;
          if (idKonta && flagaMoja(idKonta)) void zapisz();
        }, 30_000);
      }
    });
    return lancuch;
  }

  function zmien(f: (t: T) => T) {
    przyjmijLokalne();
    const nowe = o.zWire(o.doWire(f(t)));
    const z = Math.max(Date.now(), zapisano + 1);
    zapiszLokalnie({ ...o.doWire(nowe), zapisano: z }, idKonta);
    wersja++;
    ustawFlage(true, idKonta);
    ustaw(nowe, z);
    if (!idKonta) return;
    window.clearTimeout(kolejka);
    kolejka = window.setTimeout(() => {
      kolejka = undefined;
      void zapisz();
    }, 500);
  }

  function flush(): Promise<void> {
    window.clearTimeout(kolejka);
    kolejka = undefined;
    if (idKonta && flagaMoja(idKonta)) return zapisz();
    return lancuch;
  }

  // ---- odczyt z konta ----
  async function zKonta(id: string) {
    idKonta = id;
    ostatniePobranie = Date.now();
    const ta = wersja;
    const { data, error } = await supabase.from("profiles").select(o.kolumna).eq("id", id).maybeSingle();
    if (error || idKonta !== id) return;
    odczytano = true;
    // Powiadomienie po zastosowaniu wartości z konta (poniżej, bez await).
    queueMicrotask(powiadom);
    // Niezapisane zmiany tego konta wygrywają i idą na konto.
    if (flagaMoja(id)) {
      void zapisz();
      return;
    }
    // Zmiana lokalna w trakcie odczytu: odpowiedź jest już nieaktualna.
    if (ta !== wersja) return;
    const surowe = (data as Record<string, unknown> | null)?.[o.kolumna];
    const konto = jestObiektem(surowe) ? surowe : {};
    const kz = czasZapisu(konto);
    const maDane = Object.keys(o.doWire(o.zWire(konto))).length > 0;
    // Nic nigdy nie zapisano na koncie: lokalnych danych nie wysyłamy bez flagi.
    if (!kz && !maDane) return;
    // Bez niezapisanych zmian konto wygrywa. Znaczników czasu nie porównujemy: pochodzą z zegarów różnych urządzeń,
    // więc nowszy zapis z urządzenia ze spóźnionym zegarem byłby pominięty.
    const nowe = o.zWire(konto);
    zapiszLokalnie({ ...o.doWire(nowe), zapisano: kz }, id);
    ustaw(nowe, kz);
  }

  function uruchom() {
    if (uruchomione) return;
    uruchomione = true;
    const lok = odczytaj();
    if (lok) ustaw(o.zWire(lok.wire), czasZapisu(lok.wire));
    else ustaw(o.domyslne, 0);

    window.addEventListener("pagehide", () => void flush());
    window.addEventListener("online", () => {
      if (idKonta && flagaMoja(idKonta)) void zapisz();
    });
    window.addEventListener("storage", (e) => {
      if (e.key === o.klucz) przyjmijLokalne();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flush();
      else if (idKonta && Date.now() - ostatniePobranie > 60_000) void zKonta(idKonta);
    });

    supabase.auth.onAuthStateChange((zdarzenie, sesja) => {
      if (sesja) {
        const id = sesja.user.id;
        // Odświeżenie tokenu, powrót do karty i inne zdarzenia tej samej sesji nie czytają konta jeszcze raz.
        if (id === idKonta) return;
        // Dane innego konta (poprzednia sesja, inny właściciel flagi) nie mogą trafić do tego.
        const lok2 = odczytaj();
        const f = flaga();
        if ((idKonta && idKonta !== id) || (lok2?.kto && lok2.kto !== id) || (f?.kto && f.kto !== id)) wyczysc();
        idKonta = id;
        // Poza callbackiem: zapytania do Supabase w środku onAuthStateChange mogą się zakleszczyć.
        window.setTimeout(() => void zKonta(id), 0);
      } else if (zdarzenie === "SIGNED_OUT") {
        // Następna osoba na tym komputerze zaczyna od domyślnych.
        const przed = t;
        idKonta = null;
        wyczysc();
        if (o.poWylogowaniu) {
          const zostaje = o.poWylogowaniu(przed);
          zapiszLokalnie({ ...o.doWire(zostaje), zapisano: 0 }, null);
          ustaw(zostaje, 0);
        }
      }
    });
  }

  return {
    biezace: () => t,
    zmien,
    useStan: () =>
      useSyncExternalStore(
        (l) => {
          sluchacze.add(l);
          return () => void sluchacze.delete(l);
        },
        () => t,
      ),
    useBlad: () =>
      useSyncExternalStore(
        (l) => {
          sluchacze.add(l);
          return () => void sluchacze.delete(l);
        },
        () => blad,
      ),
    useOdczytano: () =>
      useSyncExternalStore(
        (l) => {
          sluchacze.add(l);
          return () => void sluchacze.delete(l);
        },
        () => odczytano,
      ),
    flush,
    uruchom,
  };
}
