import { admin, takeToken } from "../_shared/konto.ts";
import { rownaLiczba, unormujTekst, zgodnyWynik } from "./odpowiedzi.ts";
import { BladApi, obiekt, type Obiekt, obrazWiadomosci, tekst, UUID, wybierz, type Zapytaj } from "./protokol.ts";
import { rubrykaCke } from "./rubryka-cke.ts";
import { katalogWariantow, type KluczWariantu, ocenWariant, PRZEDMIOTY_WARIANTOW, SZABLONY, type SzablonId } from "./warianty.ts";

type Odpowiedz = {
  tekst: string | null;
  kod: string | null;
  jezyk: string | null;
  wynik: string | null;
  pola: Record<string, string> | null;
  obraz: ReturnType<typeof obrazWiadomosci>;
};
type Zrodlo = { wariant: string } | { arkusz: string; pytanie: string };
type Ocena = {
  status: "ocenione" | "do-weryfikacji";
  metoda: "klucz" | "testy" | "rubryka" | "brak";
  punkty: number | null;
  maksPunktow: number;
  opis: string;
  kryteria?: unknown[];
  zasady?: { pdf: string; strona: number | null };
};

function identyfikator(raw: unknown) {
  const uuid = typeof raw === "string" ? raw.toLowerCase() : "";
  if (!UUID.test(uuid)) throw new BladApi(400, "bad_input");
  return uuid;
}

function tekstOpcjonalny(raw: unknown, limit: number) {
  if (raw === undefined) return null;
  if (typeof raw !== "string" || raw.length > limit || raw.includes("\0")) throw new BladApi(400, "bad_input");
  return raw.trim() || null;
}

async function skrot(dane: unknown) {
  const bajty = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(dane)));
  return Array.from(new Uint8Array(bajty), (w) => w.toString(16).padStart(2, "0")).join("");
}

async function rpc(nazwa: string, parametry: Obiekt) {
  const { data, error } = await admin.rpc(nazwa, parametry);
  if (error) throw new BladApi(500, "server_error");
  return data;
}

async function limit(user: string, rodzaj: "wariant" | "ocena-otwarta") {
  const ok = await takeToken(user, rodzaj, rodzaj === "wariant" ? 24 : 12, 60);
  if (ok === null) throw new BladApi(500, "server_error");
  if (!ok) throw new BladApi(429, "rate_limited");
}

export function listaWariantow(body: Obiekt) {
  const przedmiot = wybierz(body.przedmiot, PRZEDMIOTY_WARIANTOW);
  if (body.przedmiot !== undefined && !przedmiot) throw new BladApi(400, "bad_input");
  return { szablony: katalogWariantow(przedmiot ?? undefined) };
}

function szablonWariantu(raw: unknown): SzablonId {
  if (typeof raw !== "string" || !Object.hasOwn(SZABLONY, raw)) throw new BladApi(400, "unknown_template");
  return raw as SzablonId;
}

function publicznyWariant(id: string, szablon: SzablonId, rekord: Obiekt) {
  if (rekord.szablon !== szablon) throw new BladApi(409, "variant_id_in_use");
  return { id, szablon, przedmiot: SZABLONY[szablon].przedmiot, zadanie: rekord.zadanie };
}

export async function utworzWariant(body: Obiekt, user: string) {
  const id = identyfikator(body.id);
  const szablon = szablonWariantu(body.szablon);
  const zakres = { p_user: user, p_id: id };
  const istniejacy = obiekt(await rpc("nauka_pobierz_wariant", zakres));
  if (istniejacy) return publicznyWariant(id, szablon, istniejacy);
  await limit(user, "wariant");

  for (let i = 0; i < 16; i++) {
    const { zadanie, klucz } = SZABLONY[szablon].generuj();
    const rekord = obiekt(await rpc("nauka_zapisz_wariant", {
      ...zakres, p_szablon: szablon, p_skrot: await skrot(zadanie), p_zadanie: zadanie, p_klucz: klucz,
    }));
    if (rekord) return publicznyWariant(id, szablon, rekord);
  }
  throw new BladApi(409, "variant_pool_exhausted");
}

function odpowiedz(raw: unknown): Odpowiedz {
  const dane = obiekt(raw);
  if (!dane) throw new BladApi(400, "bad_input");
  const polaDane = obiekt(dane.pola);
  if (dane.pola !== undefined && (!polaDane || Object.keys(polaDane).length > 10)) throw new BladApi(400, "bad_input");
  const pola: [string, string][] = [];
  for (const [klucz, wartosc] of Object.entries(polaDane ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    if (!/^[a-z][a-z0-9_-]{0,31}$/.test(klucz)) throw new BladApi(400, "bad_input");
    const wpis = tekstOpcjonalny(wartosc, 250);
    if (wpis) pola.push([klucz, wpis]);
  }
  const obraz = obrazWiadomosci(dane.obraz);
  if (dane.obraz !== undefined && !obraz) throw new BladApi(400, "bad_image");
  return {
    tekst: tekstOpcjonalny(dane.tekst, 9500),
    kod: tekstOpcjonalny(dane.kod, 12_000),
    jezyk: tekstOpcjonalny(dane.jezyk, 30),
    wynik: tekstOpcjonalny(dane.wynik, 6000),
    pola: polaDane ? Object.fromEntries(pola) : null,
    obraz,
  };
}

function zrodlo(body: Obiekt): Zrodlo {
  if (body.wariant !== undefined) {
    if (body.arkusz !== undefined || body.pytanie !== undefined) throw new BladApi(400, "bad_input");
    return { wariant: identyfikator(body.wariant) };
  }
  if (typeof body.arkusz !== "string" || !/^[a-z0-9._-]{1,120}$/.test(body.arkusz) ||
    typeof body.pytanie !== "string" || !/^\d{1,3}(?:\.\d{1,3})?$/.test(body.pytanie)) {
    throw new BladApi(400, "bad_input");
  }
  return { arkusz: body.arkusz, pytanie: body.pytanie };
}

function doWeryfikacji(maksPunktow: number, opis: string, metoda: Ocena["metoda"] = "brak"): Ocena {
  return { status: "do-weryfikacji", metoda, punkty: null, maksPunktow, opis };
}

function ocenaKluczem(punkty: number, maksPunktow: number, opis: string): Ocena {
  return { status: "ocenione", metoda: "klucz", punkty, maksPunktow, opis };
}

function cytatDoOceny(wejscie: string, fragment: string | null) {
  const odstepy = (t: string) => t.replace(/\s+/g, " ").trim();
  return !!fragment && odstepy(wejscie).includes(odstepy(fragment));
}

function jestOdpowiedz(a: Odpowiedz) {
  return Boolean(a.tekst || a.kod || a.wynik || a.obraz || Object.keys(a.pola ?? {}).length);
}

function listy(raw: unknown) {
  return Array.isArray(raw) ? raw.flatMap((w) => tekst(w, 6000) ?? []).slice(0, 30) : [];
}

function zKlucza(p: Obiekt, a: Odpowiedz, maks: number, tresc: string): Ocena | null {
  const wpis = a.wynik ?? a.tekst;
  if (!wpis || a.kod || a.obraz || a.pola || (a.tekst && a.wynik)) return null;
  const pasuje = (w: string) => {
    if (p.wynik === true || p.tabela === true) return zgodnyWynik(wpis, w);
    if (p.kod === true) return wpis.replace(/\s/g, "").toUpperCase() === w.replace(/\s/g, "").toUpperCase();
    return rownaLiczba(wpis, w) ?? unormujTekst(wpis) === unormujTekst(w);
  };
  const wymagaUzasadnienia = /\b(?:uzasadni|udowod|wykaż|wykaz|zapisz.{0,10}oblicze|podaj.{0,12}rozumowan)/i.test(tresc);
  const wynikZImportu = p.wynik === true || p.tabela === true || p.kod === true;
  if ((!wynikZImportu && (maks > 1 || wymagaUzasadnienia)) ||
    (wynikZImportu && typeof p.zasady === "string" && /poprawn[yae]\s+(?:kod|algorytm|program|zapytanie)|uzasadnieni/i.test(p.zasady))) return null;
  if ([...listy(p.oczekiwane), ...listy(p.akceptowane)].some(pasuje)) {
    return ocenaKluczem(maks, maks, `„${wpis.slice(0, 120)}” pasuje do odpowiedzi akceptowanej w kluczu arkusza.`);
  }
  if (listy(p.odrzucone).some(pasuje)) {
    return ocenaKluczem(0, maks, `Klucz wskazuje „${wpis.slice(0, 120)}” jako odpowiedź niepoprawną. Następny krok: porównaj zapis z wymaganym wynikiem w schemacie CKE.`);
  }
  return null;
}

async function sprawdzArkusz(cel: Extract<Zrodlo, { arkusz: string }>, a: Odpowiedz, zapytaj: Zapytaj): Promise<Ocena> {
  const z = obiekt(await rpc("nauka_pytanie_do_oceny", { p_arkusz: cel.arkusz, p_pytanie: cel.pytanie }));
  const p = obiekt(z?.pytanie);
  if (!z || !p) throw new BladApi(404, "question_not_found");
  if (!["matematyka", "informatyka"].includes(String(z.przedmiot)) || p.typ !== "otwarte") {
    throw new BladApi(422, "unsupported_question");
  }
  const maks = p.punkty;
  if (typeof maks !== "number" || !Number.isInteger(maks) || maks < 1 || maks > 20) {
    throw new BladApi(422, "unsupported_question");
  }
  if (!jestOdpowiedz(a)) return ocenaKluczem(0, maks, "Pusta odpowiedź.");
  const tresc = [...listy(z.polecenie), ...listy(z.kontekst), tekst(p.tresc, 5000)].filter(Boolean).join("\n").slice(0, 10_000);
  const jednoznaczna = zKlucza(p, a, maks, tresc);
  if (jednoznaczna) return jednoznaczna;

  const pdf = tekst(z.pdf, 550);
  const strona = typeof p.zasadyStrona === "number" && Number.isInteger(p.zasadyStrona) && p.zasadyStrona > 0 ? p.zasadyStrona : null;
  const zasadyImportu = tekst(p.zasady, 13_000);
  const rubrykaPdf = zasadyImportu ? null : await rubrykaCke(pdf, cel.pytanie, maks, strona);
  const kryteriaCke = zasadyImportu ?? rubrykaPdf?.zasady;
  if (!kryteriaCke) return doWeryfikacji(maks, "Potrzebny jest schemat punktowania CKE dla tego podpunktu.");

  const material = {
    przedmiot: z.przedmiot, numer: cel.pytanie, zadanie: tresc,
    maksPunktow: maks, kryteriaCke,
    przykladZKlucza: tekst(p.rozwiazanie, 6500) ?? rubrykaPdf?.rozwiazanie,
    odpowiedziZKlucza: listy(p.oczekiwane),
    praca: { tekst: a.tekst, jezyk: a.jezyk, kod: a.kod, wynik: a.wynik, pola: a.pola },
  };
  const wynik = await zapytaj(
    "nauka-ocen-rozwiazanie", "wazne",
    [
      "Oceń ćwiczebnie podany podpunkt z matematyki lub informatyki na podstawie dołączonej oficjalnej punktacji CKE.",
      "Przyznawaj punkty zgodnie z progami CKE, w tym punkty częściowe. Poprawne rozwiązania alternatywne są dopuszczalne. Nie traktuj przykładu z klucza jako jedynego sposobu.",
      "Oceń rozumowanie, gdy punktacja go wymaga. Sam wynik nie dowodzi, że uczeń wykonał wymagane kroki. Odpowiedź tekstowa, zdjęcie, kod i wynik należą do jednego zgłoszenia. Oceniaj wyłącznie wskazany numer pytania.",
      "Kod, pseudokod i SQL analizuj na podstawie ich działania i podanych danych. Nie twierdź, że zostały uruchomione. Jeśli brakuje danych, rysunku lub nie da się wiarygodnie ocenić działania, wskaż potrzebę weryfikacji.",
      "Nie obniżaj punktacji na podstawie własnej wiedzy, niewiarygodnego źródła lub wątpliwości spoza schematu CKE. Jeśli nie można pewnie odczytać pracy albo przydzielić progu punktacji, zwróć status do-weryfikacji i punkty null.",
      "Wskaż krótki, dosłowny fragment próby i wyjaśnij, dlaczego jest poprawny lub wymaga poprawy. Podaj dosłowny fragment dołączonego schematu CKE, na którym opierasz punkty, oraz oddzielnie jeden następny krok. Pisz po polsku.",
      'Format {"status":"ocenione" lub "do-weryfikacji","punkty":liczba całkowita albo null,"opis":"krótkie uzasadnienie","fragment":"fragment odpowiedzi","kryterium":"fragment kryteriów CKE","krok":"jedna sugestia"}.',
    ].join("\n"),
    material,
    3400,
    a.obraz ?? undefined,
  );
  const opis = tekst(wynik.opis, 1000);
  const status = wybierz(wynik.status, ["ocenione", "do-weryfikacji"] as const);
  const punkty = wynik.punkty;
  const fragment = tekst(wynik.fragment, 450);
  const kryterium = tekst(wynik.kryterium, 550);
  const krok = tekst(wynik.krok, 450);
  if (!opis || !status || (status === "do-weryfikacji" ? punkty !== null :
    typeof punkty !== "number" || !Number.isInteger(punkty) || punkty < 0 || punkty > maks)) {
    return doWeryfikacji(maks, "Nie udało się uzasadnić oceny zgodnie ze schematem CKE.", "rubryka");
  }
  const tekstProby = [a.tekst, a.kod, a.wynik, ...Object.values(a.pola ?? {})].filter(Boolean).join("\n");
  if (status === "ocenione" && (!cytatDoOceny(kryteriaCke, kryterium) || (tekstProby && !cytatDoOceny(tekstProby, fragment)))) {
    return { ...doWeryfikacji(maks, "Porównaj próbę z kryteriami CKE. Punkty wymagają weryfikacji.", "rubryka"), ...(pdf && { zasady: { pdf, strona } }) };
  }
  return {
    status, metoda: "rubryka", punkty: punkty as number | null, maksPunktow: maks,
    opis: [fragment ? `„${fragment}”. ${opis}` : opis, krok && `Następny krok: ${krok}`].filter(Boolean).join(" "),
    ...(pdf && { zasady: { pdf, strona } }),
  };
}

async function sprawdzWariant(id: string, user: string, a: Odpowiedz): Promise<Ocena> {
  const rekord = obiekt(await rpc("nauka_pobierz_wariant", { p_user: user, p_id: id }));
  if (!rekord) throw new BladApi(404, "variant_not_found");
  const maks = obiekt(rekord.zadanie)?.punkty;
  const klucz = obiekt(rekord.klucz);
  if (typeof maks !== "number" || !klucz) throw new BladApi(500, "server_error");
  if (!jestOdpowiedz(a)) return ocenaKluczem(0, maks, "Pusta odpowiedź.");
  const ocena = ocenWariant(klucz as KluczWariantu, { ...a, tekst: a.wynik ?? a.tekst });
  if (!ocena) return doWeryfikacji(maks, "Sprawdź format. Podaj wynik w wymaganych polach lub zapisz jedno zapytanie zgodne z poleceniem.");
  return {
    status: "ocenione", metoda: klucz.typ === "sql-sumy" ? "testy" : "klucz",
    punkty: ocena.kryteria.reduce((suma, k) => suma + k.punkty, 0), maksPunktow: maks, ...ocena,
  };
}

export async function ocenRozwiazanie(body: Obiekt, user: string, zapytaj: Zapytaj) {
  const proba = identyfikator(body.proba);
  const cel = zrodlo(body);
  const praca = odpowiedz(body.odpowiedz);
  const zakres = { p_user: user, p_id: proba, p_lease: crypto.randomUUID() };
  const rezerwacja = obiekt(await rpc("nauka_zajmij_ocene", { ...zakres, p_skrot: await skrot({ cel, praca }) }));
  if (rezerwacja?.stan === "gotowe") return obiekt(rezerwacja.wynik) ?? {};
  if (rezerwacja?.stan === "konflikt") throw new BladApi(409, "attempt_id_in_use");
  if (rezerwacja?.stan === "w-toku") throw new BladApi(409, "grading_in_progress");
  if (rezerwacja?.stan !== "zajete") throw new BladApi(500, "server_error");
  try {
    await limit(user, "ocena-otwarta");
    const ocena = "wariant" in cel ? await sprawdzWariant(cel.wariant, user, praca) : await sprawdzArkusz(cel, praca, zapytaj);
    const wynik = { proba, zrodlo: cel, ...ocena };
    if (await rpc("nauka_zakoncz_ocene", { ...zakres, p_wynik: wynik }) !== true) throw new BladApi(409, "grading_in_progress");
    return wynik;
  } catch (e) {
    await rpc("nauka_zakoncz_ocene", { ...zakres, p_wynik: null }).catch(() => {});
    throw e;
  }
}
