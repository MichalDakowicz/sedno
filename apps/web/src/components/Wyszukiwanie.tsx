import { useDeferredValue, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CornerDownLeft, FileText, LayoutGrid, MessageCircle, Search, Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useListaArkuszy } from "../arkusze/dane";
import { currentUserId, useProfil } from "../auth";
import { nazwaPoziomu, przedmiot } from "../konto/przedmioty";
import { useTutor } from "./TutorContext";
import { slowaTekstu, szukaj, wczytajOstatnie, zapamietajOstatnie, type RodzajWyniku, type Wynik } from "./szukaj";
import styles from "./Wyszukiwanie.module.css";

/** Zdarzenie, którym lupa w pasku otwiera okno. */
export const OTWORZ_SZUKAJ = "sedno-szukaj";

const IKONY: Record<RodzajWyniku, LucideIcon> = { akcja: LayoutGrid, arkusz: FileText, rozmowa: MessageCircle };
const GRUPY: { rodzaj: RodzajWyniku; nazwa: string; limit: number }[] = [
  { rodzaj: "akcja", nazwa: "Akcje", limit: 5 },
  { rodzaj: "arkusz", nazwa: "Arkusze", limit: 6 },
  { rodzaj: "rozmowa", nazwa: "Rozmowy z Pestką", limit: 4 },
];

const DEFINICJE_AKCJI = [
  { id: "akcja:pulpit", tytul: "Pulpit", opis: "", klucze: "strona glowna start", sciezka: "/" },
  { id: "akcja:arkusze", tytul: "Arkusze", opis: "Arkusze maturalne CKE", klucze: "arkusz matura cke", sciezka: "/arkusze" },
  { id: "akcja:pestka", tytul: "Rozmowa z Pestką", opis: "Tutor AI", klucze: "tutor czat pytanie", sciezka: "/tutor" },
  { id: "akcja:profil", tytul: "Profil", opis: "Przedmioty i konto AI", klucze: "konto przedmioty ai klucz", sciezka: "/profil" },
  { id: "akcja:ustawienia", tytul: "Ustawienia", opis: "Wygląd, dostępność i Pestka", klucze: "motyw ciemny jasny tekst rozmiar dostepnosc pestka wyglad", sciezka: "/ustawienia" },
  { id: "akcja:profil-ucznia", tytul: "Profil ucznia", opis: "Sposób nauki, cele i priorytety", klucze: "profil uczen cel cele priorytety czas nauka", sciezka: "/profil-ucznia" },
  { id: "akcja:uklad-pulpitu", tytul: "Układ pulpitu", opis: "Widgety na pulpicie", klucze: "uklad pulpit widgety kolejnosc egzamin", sciezka: "/uklad-pulpitu" },
  { id: "akcja:do-matury", tytul: "Do matury", opis: "Odliczanie do egzaminów", klucze: "matura odliczanie dni egzamin termin", sciezka: "/do-matury" },
];
const AKCJE: Wynik[] = DEFINICJE_AKCJI.map((a) => ({
  id: a.id,
  rodzaj: "akcja",
  tytul: a.tytul,
  opis: a.opis || undefined,
  slowa: slowaTekstu(`${a.tytul} ${a.opis} ${a.klucze}`),
  sciezka: a.sciezka,
}));

// Dłuższy tekst to pytanie dla Pestki, nie hasło: nie ma sensu go dopasowywać.
const MAX_HASLO = 120;
const MAX_CZAT = 300;

const liczbaWynikow = (n: number) => (n === 1 ? "1 wynik" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 > 20) ? `${n} wyniki` : `${n} wyników`);

type Pozycja = Wynik | "pestka" | "ai";
const idPoz = (p: Pozycja) => (typeof p === "string" ? p : p.id);

export function Wyszukiwanie() {
  const [otwarte, setOtwarte] = useState(false);
  // Element, który miał fokus w chwili otwarcia: autoFocus w oknie przejmuje fokus, więc zapamiętujemy go wcześniej.
  const opener = useRef<HTMLElement | null>(null);
  const bylOtwarte = useRef(false);

  const otworz = () => {
    if (!bylOtwarte.current) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOtwarte(true);
  };

  // Po zamknięciu okna (już usuniętego z drzewa) fokus wraca do opener, a gdy go nie ma, na początek strony.
  useEffect(() => {
    bylOtwarte.current = otwarte;
    if (otwarte) return;
    const el = opener.current;
    opener.current = null;
    if (!el) return;
    if (el.isConnected) el.focus();
    else document.body.focus();
  }, [otwarte]);

  useEffect(() => {
    const klawisz = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        // Monaco ma własne akordy zaczynające się od Ctrl+K.
        if (e.target instanceof Element && e.target.closest(".monaco-editor")) return;
        e.preventDefault();
        otworz();
      }
    };
    window.addEventListener(OTWORZ_SZUKAJ, otworz);
    window.addEventListener("keydown", klawisz);
    return () => {
      window.removeEventListener(OTWORZ_SZUKAJ, otworz);
      window.removeEventListener("keydown", klawisz);
    };
  }, []);

  return otwarte ? <Okno zamknij={() => setOtwarte(false)} /> : null;
}

function Okno({ zamknij }: { zamknij: () => void }) {
  const navigate = useNavigate();
  const { rozmowy, otworzRozmowe, zapytajWNowej, aiGotowe, state } = useTutor();
  const { dane: arkusze, laduje, blad } = useListaArkuszy();
  const profil = useProfil();
  const wlasciciel = currentUserId();
  const [tekst, setTekst] = useState("");
  const [wybranyId, setWybranyId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Lista z pamięci podręcznej wraca od razu: komunikat o wczytywaniu pokazujemy dopiero po chwili.
  const [dlugoLaduje, setDlugoLaduje] = useState(false);
  useEffect(() => {
    if (!laduje) return setDlugoLaduje(false);
    const t = window.setTimeout(() => setDlugoLaduje(true), 300);
    return () => window.clearTimeout(t);
  }, [laduje]);

  // Słowa każdej pozycji liczymy raz tutaj, nie przy każdym znaku.
  const indeks = useMemo<Wynik[]>(() => {
    const moje = new Set<string>(profil?.subjects.map((s) => s.id));
    const sheety = (arkusze ?? []).map<Wynik>((a) => {
      const nazwa = przedmiot(a.przedmiot)?.nazwa ?? a.przedmiot;
      const tytul = `${nazwa} ${nazwaPoziomu[a.poziom]}, ${a.sesja} ${a.rok}`;
      return {
        id: `arkusz:${a.id}`,
        rodzaj: "arkusz",
        tytul,
        slowa: slowaTekstu(`${tytul} ${a.symbol} arkusz`),
        sciezka: `/arkusze/${a.id}`,
        premia: moje.has(a.przedmiot) ? 0.5 : 0,
      };
    });
    // Rozmowy: tytuł i własne wiadomości ucznia, skrócone.
    const chaty = rozmowy.map<Wynik>((r) => ({
      id: `rozmowa:${r.id}`,
      rodzaj: "rozmowa",
      tytul: r.tytul,
      slowa: slowaTekstu(`${r.tytul} ${r.wiadomosci.filter((m) => m.from === "student").map((m) => m.text).join(" ")}`.slice(0, MAX_CZAT)),
      sciezka: "/tutor",
      rozmowaId: r.id,
    }));
    return [...AKCJE, ...sheety, ...chaty];
  }, [arkusze, profil, rozmowy]);

  const pytanie = tekst.trim();
  const szukane = useDeferredValue(pytanie);
  const dlugie = szukane.length > MAX_HASLO;
  // Pytanie pełnym zdaniem trafia do Pestki przed wynikami, krótkie hasło za nimi.
  const pestkaPierwsza = dlugie || szukane.includes("?") || szukane.split(/\s+/).length >= 4;

  const grupy = useMemo(() => {
    if (!szukane) {
      const poId = new Map(indeks.map((w) => [w.id, w]));
      const ostatnie = wczytajOstatnie(wlasciciel).flatMap((x) => poId.get(x) ?? []);
      const polecane = AKCJE.filter((a) => !ostatnie.some((o) => o.id === a.id));
      return [
        { nazwa: "Ostatnie", wyniki: ostatnie },
        { nazwa: "Polecane", wyniki: polecane },
      ].filter((g) => g.wyniki.length);
    }
    if (dlugie) return [];
    const trafione = szukaj(szukane, indeks);
    return GRUPY.map((g) => ({ nazwa: g.nazwa, wyniki: trafione.filter((w) => w.rodzaj === g.rodzaj).slice(0, g.limit) })).filter((g) => g.wyniki.length);
  }, [szukane, dlugie, indeks, wlasciciel]);

  // Pestka: gotowa, zajęta (odpowiada), bez AI (odsyłamy do profilu) albo jeszcze sprawdzamy (ukryta).
  const pestka: "gotowa" | "zajeta" | "brak-ai" | null = !szukane || aiGotowe === undefined ? null : aiGotowe === false ? "brak-ai" : state !== "idle" ? "zajeta" : "gotowa";
  const pozycjaPestki: Pozycja | null = pestka === "gotowa" ? "pestka" : pestka === "brak-ai" ? "ai" : null;

  // Odpowiedź Pestki wpada do rozmowy, w której padło pytanie, więc w trakcie niej nie przełączamy rozmów.
  const zajetaPestka = state !== "idle";
  const zablokowana = (p: Pozycja) => zajetaPestka && typeof p !== "string" && !!p.rozmowaId;

  const plaska = useMemo<Pozycja[]>(() => {
    const w: Pozycja[] = grupy.flatMap((g) => g.wyniki).filter((p) => !(zajetaPestka && p.rozmowaId));
    if (!pozycjaPestki) return w;
    return pestkaPierwsza ? [pozycjaPestki, ...w] : [...w, pozycjaPestki];
  }, [grupy, pozycjaPestki, pestkaPierwsza, zajetaPestka]);

  // Zaznaczenie trzyma id pozycji; gdy zniknie z listy, wraca na pierwszą.
  const znaleziony = plaska.findIndex((p) => idPoz(p) === wybranyId);
  const wybrany = znaleziony >= 0 ? znaleziony : 0;

  useEffect(() => setWybranyId(null), [szukane]);
  useEffect(() => {
    const lista = listaRef.current;
    const el = lista?.querySelector('[aria-selected="true"]');
    if (!lista || !el) return;
    if (wybrany === 0) lista.scrollTop = 0;
    else if (!el.previousElementSibling) el.closest('[role="group"]')?.scrollIntoView({ block: "nearest" });
    else el.scrollIntoView({ block: "nearest" });
  }, [wybrany, plaska]);

  function otworz(p: Pozycja) {
    if (p === "pestka") {
      // Pytanie z wyszukiwania zaczyna nową rozmowę.
      zapytajWNowej(pytanie);
      navigate("/tutor");
    } else if (p === "ai") {
      navigate("/profil#ai");
    } else {
      zapamietajOstatnie(wlasciciel, p.id);
      if (p.rozmowaId) otworzRozmowe(p.rozmowaId);
      navigate(p.sciezka);
    }
    zamknij();
  }

  function klawisz(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = plaska.length;
      if (n) setWybranyId(idPoz(plaska[(wybrany + (e.key === "ArrowDown" ? 1 : -1) + n) % n]));
    } else if (e.key === "Enter" && plaska[wybrany]) {
      e.preventDefault();
      otworz(plaska[wybrany]);
    }
  }

  const idPozycji = (i: number) => `${id}-${i}`;
  const wiersz = (p: Pozycja) => {
    const i = plaska.indexOf(p);
    if (zablokowana(p) && typeof p !== "string")
      return (
        <li key={p.id} role="option" aria-disabled="true" aria-selected="false" className={`muted ${styles.zajeta}`}>
          <MessageCircle size={16} aria-hidden="true" />
          <span className={styles.tekst}>
            <span>{p.tytul}</span>
            <span className="small">Pestka jeszcze odpowiada</span>
          </span>
        </li>
      );
    const Ikona = typeof p === "string" ? Sparkles : IKONY[p.rodzaj];
    const nazwa = p === "pestka" ? `Zapytaj Pestkę: „${pytanie}”` : p === "ai" ? "Podepnij AI, żeby pytać Pestkę" : p.tytul;
    return (
      <li
        key={idPoz(p)}
        id={idPozycji(i)}
        role="option"
        aria-selected={i === wybrany}
        className={styles.wiersz}
        onMouseMove={() => i !== wybrany && setWybranyId(idPoz(p))}
        onClick={() => otworz(p)}
      >
        <Ikona size={16} aria-hidden="true" />
        <span className={styles.tekst}>
          <span>{nazwa}</span>
          {typeof p !== "string" && p.opis && <span className="muted small">{p.opis}</span>}
        </span>
        {i === wybrany && <CornerDownLeft size={14} aria-hidden="true" />}
      </li>
    );
  };

  const blokPestki =
    pestka === "zajeta" ? (
      <div key="pestka" className={styles.grupa} role="group" aria-label="Pestka">
        <span className="label" aria-hidden="true">
          Pestka
        </span>
        <ul role="presentation">
          <li role="option" aria-disabled="true" aria-selected="false" className={`muted ${styles.zajeta}`}>
            <Sparkles size={16} aria-hidden="true" />
            <span>Zapytaj Pestkę: Pestka jeszcze odpowiada</span>
          </li>
        </ul>
      </div>
    ) : pozycjaPestki ? (
      <div key="pestka" className={styles.grupa} role="group" aria-label="Pestka">
        <span className="label" aria-hidden="true">
          Pestka
        </span>
        <ul role="presentation">{wiersz(pozycjaPestki)}</ul>
      </div>
    ) : null;
  const bloki = grupy.map((g) => (
    <div key={g.nazwa} className={styles.grupa} role="group" aria-label={g.nazwa}>
      <span className="label" aria-hidden="true">
        {g.nazwa}
      </span>
      <ul role="presentation">{g.wyniki.map(wiersz)}</ul>
    </div>
  ));

  const liczba = grupy.reduce((n, g) => n + g.wyniki.length, 0);
  const bladArkuszy = blad && blad !== "brak-danych";
  const komunikat = laduje
    ? dlugoLaduje
      ? "Wczytuję arkusze…"
      : null
    : bladArkuszy
      ? "Nie udało się wczytać arkuszy."
      : dlugie && aiGotowe === undefined
        ? "Sprawdzam, czy Pestka jest dostępna…"
        : szukane && !dlugie && liczba === 0
          ? aiGotowe === true
            ? "Nic nie znalazłam. Możesz zapytać Pestkę."
            : "Nic nie znalazłam."
          : null;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label="Szukaj"
      onCancel={(e) => {
        e.preventDefault();
        zamknij();
      }}
      onClick={(e) => e.target === e.currentTarget && zamknij()}
    >
      <div className={styles.pole}>
        <Search size={18} aria-hidden="true" />
        <input
          autoFocus
          className={styles.input}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={`${id}-lista`}
          aria-activedescendant={plaska.length ? idPozycji(wybrany) : undefined}
          aria-autocomplete="list"
          aria-label="Szukaj arkuszy, akcji i rozmów albo zadaj pytanie Pestce"
          placeholder="Szukaj albo zadaj pytanie Pestce"
          autoComplete="off"
          spellCheck={false}
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          onKeyDown={klawisz}
        />
        <button type="button" className={styles.zamknij} onClick={zamknij} aria-label="Zamknij">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div ref={listaRef} className={styles.lista} id={`${id}-lista`} role="listbox" aria-label="Wyniki">
        {pestkaPierwsza ? [blokPestki, ...bloki] : [...bloki, blokPestki]}
      </div>
      <div role="status" aria-live="polite">
        {komunikat ? (
          <p className={`muted small ${styles.pusto}`}>{komunikat}</p>
        ) : szukane && !dlugie ? (
          <span className="visually-hidden">{liczbaWynikow(liczba)}</span>
        ) : null}
      </div>
      <p className={`muted small ${styles.stopka}`}>↑↓ wybierz · Enter otwórz · Esc zamknij</p>
    </dialog>
  );
}
