// Historia opanowania (nauka_historia) i aktywności (nauka_aktywnosc) w kształcie do wykresów. Punkty historii są rzadkie:
// jeden na dzień, w którym opanowanie się zmieniło, więc wartość z dnia bez punktu to ostatnia wcześniejsza.
// Gdy danych jest za mało, funkcje zwracają null, a widok nie pokazuje sekcji.
import type { AktywnoscNauki, HistoriaNauki, PunktHistorii } from "./api";

/** Data YYYY-MM-DD przesunięta o n dni (w UTC, bez wpływu stref i zmian czasu). */
export function przesunDzien(dzien: string, n: number) {
  const d = new Date(`${dzien}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const dniMiedzy = (od: string, doDnia: string) =>
  Math.round((Date.parse(`${doDnia}T12:00:00Z`) - Date.parse(`${od}T12:00:00Z`)) / 86_400_000);

/** Opanowanie (score z mapy) na koniec dnia: ostatni punkt nie późniejszy niż ten dzień; null bez oceny. */
export function wartoscNaDzien(punkty: PunktHistorii[], dzien: string): number | null {
  let wynik: number | null = null;
  for (const p of punkty) {
    if (p.day > dzien) break;
    wynik = p.score;
  }
  return wynik;
}

const posortowane = (punkty: PunktHistorii[]) => [...punkty].sort((a, b) => a.day.localeCompare(b.day));

export type LiniaOpanowania = { wartosci: number[]; dni: number; zmiana: number };

/**
 * Linia opanowania od pierwszego dnia z oceną do `doDnia`, najwyżej `maks` próbek w równych odstępach czasu
 * (Linia rysuje punkty w równych odstępach, więc próbkujemy dni, a nie same punkty). Wymaga ocen z co najmniej
 * dwóch różnych dni. zmiana: w punktach procentowych między pierwszą a ostatnią próbką.
 */
export function liniaOpanowania(punkty: PunktHistorii[], doDnia: string, maks = 12): LiniaOpanowania | null {
  const lista = posortowane(punkty).filter((p) => p.day <= doDnia);
  const zOcena = lista.filter((p) => p.score != null);
  if (new Set(zOcena.map((p) => p.day)).size < 2) return null;
  const start = zOcena[0]!.day;
  const dni = dniMiedzy(start, doDnia);
  if (dni < 1) return null;
  const krok = Math.max(1, Math.ceil(dni / (maks - 1)));
  const probki: string[] = [];
  for (let d = start; d < doDnia; d = przesunDzien(d, krok)) probki.push(d);
  probki.push(doDnia);
  const wartosci = probki.map((d) => wartoscNaDzien(lista, d)).filter((v): v is number => v != null);
  if (wartosci.length < 2) return null;
  return { wartosci, dni, zmiana: Math.round(wartosci.at(-1)! * 100) - Math.round(wartosci[0]! * 100) };
}

/** „tydzień temu”, „3 dni temu”, „2 miesiące temu”; 1 dzień to „wczoraj”. */
export function okresTemu(dni: number): string {
  if (dni <= 1) return "wczoraj";
  if (dni < 7) return `${dni} dni temu`;
  if (dni < 14) return "tydzień temu";
  if (dni < 28) return `${Math.floor(dni / 7)} tygodnie temu`;
  if (dni < 60) return "miesiąc temu";
  return `${Math.floor(dni / 30)} miesiące temu`;
}

/** Tytuł-wniosek linii opanowania: „O 12% więcej niż 3 tygodnie temu”. */
export function wniosekLinii({ zmiana, dni }: LiniaOpanowania): string {
  const kiedy = okresTemu(dni);
  if (zmiana === 0) return `Tyle samo co ${kiedy}`;
  return `O ${Math.abs(zmiana)}% ${zmiana > 0 ? "więcej" : "mniej"} niż ${kiedy}`;
}

/**
 * Średnia zmiana opanowania w ostatnich siedmiu dniach (pkt proc.) po umiejętnościach, które miały ocenę i tydzień temu,
 * i dziś. null, gdy nie ma żadnej takiej umiejętności albo nic się nie zmieniło.
 */
export function zmianaWTygodniu(historia: HistoriaNauki, dzis: string): number | null {
  const tydzienTemu = przesunDzien(dzis, -7);
  const roznice = historia.skills.flatMap((u) => {
    const lista = posortowane(u.points);
    const teraz = wartoscNaDzien(lista, dzis);
    const wtedy = wartoscNaDzien(lista, tydzienTemu);
    return teraz != null && wtedy != null ? [Math.round(teraz * 100) - Math.round(wtedy * 100)] : [];
  });
  if (!roznice.length) return null;
  const srednia = Math.round(roznice.reduce((s, r) => s + r, 0) / roznice.length);
  return srednia === 0 ? null : srednia;
}

export type MinutyTygodni = { wartosci: number[]; teraz: number; poprzednio: number };

/** Minuty nauki w ostatnich tygodniach (od najstarszego); null, gdy minuty są w mniej niż dwóch tygodniach. */
export function minutyTygodni(aktywnosc: AktywnoscNauki): MinutyTygodni | null {
  const tygodnie = [...aktywnosc.weeks].sort((a, b) => a.od.localeCompare(b.od));
  if (tygodnie.filter((t) => t.minuty > 0).length < 2) return null;
  const wartosci = tygodnie.map((t) => Math.max(0, Math.round(t.minuty)));
  return { wartosci, teraz: wartosci.at(-1) ?? 0, poprzednio: wartosci.at(-2) ?? 0 };
}

/** Tytuł-wniosek minut: „35 min w tym tygodniu, o 10 więcej niż w poprzednim”. */
export function wniosekMinut({ teraz, poprzednio }: MinutyTygodni): string {
  const roznica = teraz - poprzednio;
  const porownanie = roznica === 0 ? "tyle samo co w poprzednim" : `o ${Math.abs(roznica)} ${roznica > 0 ? "więcej" : "mniej"} niż w poprzednim`;
  return `${teraz} min w tym tygodniu, ${porownanie}`;
}

/** Dni z nauką (YYYY-MM-DD) z dziennika aktywności. */
export const dniAktywne = (aktywnosc: AktywnoscNauki) => new Set(aktywnosc.days.filter((d) => d.aktywny).map((d) => d.day));
