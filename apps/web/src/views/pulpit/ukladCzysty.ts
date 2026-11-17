// Czyste operacje na układzie pulpitu: bez Reacta, sieci i rejestru komponentów (rejestr przychodzi jako argument).
// Wszystko jest po id widgetu, a flaga włączenia podróżuje razem z widgetem.

export type Pozycja = { id: string; wl: boolean };
export type GotowyUklad = "nauka" | "egzamin";
/** Ruchome widgety (bez stałych) w domyślnej kolejności i ich ustawienia w gotowych układach. */
export type Rejestr = { id: string; nauka: boolean; egzamin: boolean }[];
/** Co leży na koncie: nazwa gotowego układu, własna lista albo nic. */
export type Zapisany = "egzamin" | Pozycja[] | undefined;

export function gotowy(rejestr: Rejestr, nazwa: GotowyUklad): Pozycja[] {
  return rejestr.map((w) => ({ id: w.id, wl: w[nazwa] }));
}

/**
 * Pełna lista według aktualnego rejestru: nazwa gotowego układu jest rozwijana, nieznane i powtórzone id znikają,
 * a widget, którego w zapisie brakuje (dodany w nowszej wersji), staje na swoim domyślnym miejscu z ustawieniem
 * z układu „Nauka”.
 */
export function normalizuj(zapisany: Zapisany, rejestr: Rejestr): Pozycja[] {
  if (zapisany === "egzamin") return gotowy(rejestr, "egzamin");
  if (!zapisany) return gotowy(rejestr, "nauka");
  const miejsce = (id: string) => rejestr.findIndex((r) => r.id === id);
  const wynik: Pozycja[] = [];
  for (const p of zapisany) if (miejsce(p.id) !== -1 && !wynik.some((x) => x.id === p.id)) wynik.push({ id: p.id, wl: p.wl });
  rejestr.forEach((w, i) => {
    if (wynik.some((x) => x.id === w.id)) return;
    // Przed pierwszym widgetem, który w rejestrze jest po nim; jeśli takiego nie ma, na końcu.
    const nastepny = wynik.findIndex((x) => miejsce(x.id) > i);
    wynik.splice(nastepny === -1 ? wynik.length : nastepny, 0, { id: w.id, wl: w.nauka });
  });
  return wynik;
}

export function przelacz(lista: Pozycja[], id: string): Pozycja[] {
  return lista.map((p) => (p.id === id ? { ...p, wl: !p.wl } : p));
}

/** Przesuwa widget na wskazane miejsce (indeks na liście), razem z jego ustawieniem. */
export function przesunDo(lista: Pozycja[], id: string, indeks: number): Pozycja[] {
  const z = lista.findIndex((p) => p.id === id);
  const na = Math.max(0, Math.min(lista.length - 1, indeks));
  if (z === -1 || z === na) return lista;
  const nowa = [...lista];
  const [p] = nowa.splice(z, 1);
  nowa.splice(na, 0, p!);
  return nowa;
}

/** Układa listę w kolejności `ids` (widgety spoza `ids` zostają na końcu), z ustawieniami przy widgetach. */
export function kolejnosc(lista: Pozycja[], ids: string[]): Pozycja[] {
  const wynik = ids.flatMap((id) => lista.find((p) => p.id === id) ?? []);
  return [...wynik, ...lista.filter((p) => !ids.includes(p.id))];
}

/** Przesuwa widget o `delta` miejsc (−1 w górę, +1 w dół). */
export function przesun(lista: Pozycja[], id: string, delta: number): Pozycja[] {
  const z = lista.findIndex((p) => p.id === id);
  return z === -1 ? lista : przesunDo(lista, id, z + delta);
}

const rowne = (a: Pozycja[], b: Pozycja[]) => a.length === b.length && a.every((p, i) => p.id === b[i]!.id && p.wl === b[i]!.wl);

/** Nazwa układu, któremu odpowiada lista; każda inna to „wlasny”. */
export function nazwaUkladu(lista: Pozycja[], rejestr: Rejestr): GotowyUklad | "wlasny" {
  if (rowne(lista, gotowy(rejestr, "nauka"))) return "nauka";
  if (rowne(lista, gotowy(rejestr, "egzamin"))) return "egzamin";
  return "wlasny";
}
