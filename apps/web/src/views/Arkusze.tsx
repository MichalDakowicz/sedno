import { useState, type KeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { rozgrzejArkusz, useListaArkuszy } from "../arkusze/dane";
import { wczytajPostep } from "../arkusze/postep";
import {
  KOLEJNOSC_TERMINOW,
  formulaArkusza,
  nazwaPrzedmiotu,
  nazwaSesji,
  nazwyTerminow,
  porownajArkusze,
  terminArkusza,
  type ArkuszWpis,
  type Poziom,
  type Przedmiot,
} from "../arkusze/typy";
import { useProfil } from "../auth";
import { brakArkuszy, PRZEDMIOTY, przedmiot as opisPrzedmiotu } from "../konto/przedmioty";
import { NaglowekStrony } from "../components/NaglowekStrony";
import { Ladowanie } from "../components/Ladowanie";
import { Pierscien } from "../components/wykresy";
import { Pigulki } from "../components/Pigulki";
import { usePostepyKonta } from "../konto/wyniki";
import { liczOdpowiedzi } from "../arkusze/sprawdz";
import styles from "./Arkusze.module.css";

const POZIOMY: Poziom[] = ["podstawowy", "rozszerzony", "dwujezyczny"];
const NAZWY: Record<Poziom, string> = { podstawowy: "Podstawowy", rozszerzony: "Rozszerzony", dwujezyczny: "Dwujęzyczny" };
const FORMULY = ["2023", "2015"] as const;

/** Strzałki Lewo/Prawo (i Home/End) przenoszą fokus między pigułkami grupy; Enter i Spacja aktywują natywnie. */
function ruchStrzalkami(e: KeyboardEvent<HTMLElement>) {
  // Lista „Inne przedmioty” w tej samej grupie zachowuje własne strzałki.
  if (!(e.target instanceof HTMLButtonElement)) return;
  const przyciski = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button.pigulka"));
  const i = przyciski.indexOf(e.target);
  if (i < 0) return;
  const n = przyciski.length;
  const cel = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
  if (cel < 0) return;
  e.preventDefault();
  przyciski[cel].focus();
}

const liczbaArkuszy = (n: number) => (n === 1 ? "1 arkusz" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? `${n} arkusze` : `${n} arkuszy`);

const idPrzedmiotu = (a: ArkuszWpis): Przedmiot => a.przedmiot ?? "angielski";
const nazwaKrotka = (id: Przedmiot) => opisPrzedmiotu(id)?.nazwa ?? id;

export function Arkusze() {
  const { dane, blad, laduje } = useListaArkuszy();
  const profil = useProfil();
  // Domyślnie przedmiot i poziom, które konto zdaje (pierwszy z listy, jeśli zdaje kilka).
  const poziomKonta = (p: Przedmiot) => profil?.subjects.find((s) => s.id === p)?.poziom as Poziom | undefined;
  // ?przedmiot=…&poziom=… (z pulpitu i Nauki) otwiera od razu właściwą zakładkę.
  const [parametry] = useSearchParams();
  const zAdresu = PRZEDMIOTY.find((p) => p.id === parametry.get("przedmiot"))?.id;
  const poziomZAdresu = POZIOMY.find((p) => p === parametry.get("poziom"));
  const [wybrany, setPrzedmiot] = useState<Przedmiot>(() => zAdresu ?? profil?.subjects[0]?.id ?? "angielski");
  const [wybranyPoziom, setPoziom] = useState<Poziom>(() => poziomZAdresu ?? poziomKonta(wybrany) ?? "podstawowy");
  const [wybranaFormula, setFormula] = useState<string>(FORMULY[0]);

  // Przełącznik zna tylko przedmioty, które mają arkusze: najpierw te z profilu (pigułki), reszta w liście „Inne”.
  const zArkuszami = new Set((dane ?? []).map(idPrzedmiotu));
  const mojeId = [...new Set((profil?.subjects ?? []).map((s) => s.id))];
  const glowne = mojeId.filter((id) => zArkuszami.has(id));
  const inne = PRZEDMIOTY.map((p) => p.id).filter((id) => zArkuszami.has(id) && !glowne.includes(id));
  const przedmiot = !dane || zArkuszami.has(wybrany) ? wybrany : (glowne[0] ?? inne[0] ?? wybrany);

  const zPrzedmiotu = dane?.filter((a) => idPrzedmiotu(a) === przedmiot);
  // Poziomy, dla których są arkusze przedmiotu.
  const poziomy = POZIOMY.filter((p) => !zPrzedmiotu || zPrzedmiotu.some((a) => a.poziom === p));
  const poziom = poziomy.includes(wybranyPoziom) ? wybranyPoziom : (poziomy[0] ?? "podstawowy");
  const naPoziomie = zPrzedmiotu?.filter((a) => a.poziom === poziom) ?? [];
  // Formuły tego poziomu: bez wyboru pierwsza (2023), bo to ona obowiązuje na obecnej maturze.
  const formuly = FORMULY.filter((f) => naPoziomie.some((a) => formulaArkusza(a) === f));
  const formula = formuly.some((f) => f === wybranaFormula) ? wybranaFormula : (formuly[0] ?? FORMULY[0]);
  const arkusze = naPoziomie.filter((a) => formulaArkusza(a) === formula).sort(porownajArkusze);
  const terminy = KOLEJNOSC_TERMINOW.map((t) => ({ termin: t, arkusze: arkusze.filter((a) => terminArkusza(a) === t) })).filter((g) => g.arkusze.length);

  // Poziom z profilu, którego arkuszy jeszcze nie ma, i przedmioty z profilu bez żadnych arkuszy: mówimy to wprost.
  const brakPoziomu = zPrzedmiotu && poziomKonta(przedmiot) && !poziomy.includes(poziomKonta(przedmiot)!) ? poziomKonta(przedmiot)! : null;
  const bezArkuszy = dane ? mojeId.filter((id) => !zArkuszami.has(id)) : [];

  function wybierzPrzedmiot(id: Przedmiot) {
    setPrzedmiot(id);
    setPoziom(poziomKonta(id) ?? "podstawowy");
  }

  return (
    <main className={`container ${styles.page}`}>
      <NaglowekStrony etykieta={nazwaPrzedmiotu[przedmiot]} tytul="Arkusze" />

      {dane && (
        <div className={styles.filtry}>
          <Pigulki role="group" aria-label="Przedmiot" onKeyDown={ruchStrzalkami}>
            {glowne.map((id) => (
              <button key={id} type="button" className="pigulka" onClick={() => wybierzPrzedmiot(id)} aria-pressed={przedmiot === id} tabIndex={id === (glowne.includes(przedmiot) ? przedmiot : glowne[0]) ? 0 : -1}>
                {nazwaKrotka(id)}
              </button>
            ))}
            {inne.length > 0 && (
              <select
                className={`select ${styles.inne}`}
                aria-label="Inne przedmioty"
                data-wybrany={inne.includes(przedmiot)}
                value={inne.includes(przedmiot) ? przedmiot : ""}
                onChange={(e) => wybierzPrzedmiot(e.target.value as Przedmiot)}
              >
                <option value="" disabled>{glowne.length ? "Inne przedmioty" : "Wybierz przedmiot"}</option>
                {inne.map((id) => (
                  <option key={id} value={id}>{nazwaKrotka(id)}</option>
                ))}
              </select>
            )}
          </Pigulki>

          {(poziomy.length > 1 || formuly.length > 1) && (
            <div className={styles.opcje}>
              {poziomy.length > 1 && (
                <Pigulki role="group" aria-label="Poziom matury" onKeyDown={ruchStrzalkami}>
                  {poziomy.map((p) => (
                    <button key={p} type="button" className="pigulka" onClick={() => setPoziom(p)} aria-pressed={poziom === p} tabIndex={poziom === p ? 0 : -1} aria-label={`${NAZWY[p]}, ${liczbaArkuszy(zPrzedmiotu!.filter((a) => a.poziom === p).length)}`}>
                      {NAZWY[p]}
                      <span className={styles.levelCount} aria-hidden="true">{zPrzedmiotu!.filter((a) => a.poziom === p).length}</span>
                    </button>
                  ))}
                </Pigulki>
              )}

              {formuly.length > 1 && (
                <Pigulki role="group" aria-label="Formuła matury" onKeyDown={ruchStrzalkami}>
                  {formuly.map((f) => (
                    <button key={f} type="button" className="pigulka" onClick={() => setFormula(f)} aria-pressed={formula === f} tabIndex={formula === f ? 0 : -1} aria-label={`Formuła ${f}, ${liczbaArkuszy(naPoziomie.filter((a) => formulaArkusza(a) === f).length)}`}>
                      Formuła {f}
                      <span className={styles.levelCount} aria-hidden="true">{naPoziomie.filter((a) => formulaArkusza(a) === f).length}</span>
                    </button>
                  ))}
                </Pigulki>
              )}
            </div>
          )}
        </div>
      )}

      {brakPoziomu && (
        <div className={styles.braki}>
          <p className="muted">{brakArkuszy(przedmiot, brakPoziomu, poziomy)}</p>
        </div>
      )}

      {/* Wznowienie dotyczy wybranego przedmiotu, żeby nad arkuszami informatyki nie stał arkusz z angielskiego. */}
      {zPrzedmiotu && <KontynuujArkusz lista={zPrzedmiotu} />}

      {laduje && <Ladowanie ksztalt="wiersze" ile={5} etykieta="Wczytuję listę arkuszy" />}
      {blad && <BrakDanych blad={blad} />}

      {terminy.length > 0 && (
        <div className={styles.grupy} role="group" aria-label={`Arkusze, formuła ${formula}`}>
          {terminy.map((g) => (
            <section key={`${formula}-${g.termin}`} className={`${styles.group} wejscie`} aria-labelledby={`termin-${g.termin}`}>
              <header className={styles.groupHead}>
                <h2 className="h3" id={`termin-${g.termin}`}>{nazwyTerminow[g.termin]}</h2>
                <p className="small muted">{opisGrupy(g.arkusze).join(" · ")}</p>
              </header>
              <ul className={`wiersze ${styles.list}`}>
                {g.arkusze.map((a) => (
                  <Wiersz key={a.id} arkusz={a} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Przedmioty z profilu bez arkuszy nie mają zakładki: informacja o nich stoi pod listą, a nie nad arkuszami innego przedmiotu. */}
      {bezArkuszy.length > 0 && (
        <div className={styles.braki}>
          {bezArkuszy.map((id) => (
            <p key={id} className="muted">{brakArkuszy(id, null, [])}</p>
          ))}
        </div>
      )}
    </main>
  );
}

/** Arkusz w trakcie (ostatnio ruszany, z odpowiedziami, niesprawdzony): jeden wiersz na górze listy. */
function KontynuujArkusz({ lista }: { lista: ArkuszWpis[] }) {
  const wiersze = usePostepyKonta();
  const wgId = new Map(lista.map((a) => [a.id, a]));
  const zaczety = [...(wiersze ?? [])]
    .filter((w) => !w.data.wynik && wgId.has(w.sheet_id) && liczOdpowiedzi(w.data.odpowiedzi) > 0)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  if (!zaczety) return null;
  const a = wgId.get(zaczety.sheet_id)!;
  return (
    <Link to={`/arkusze/${a.id}`} className={`wiersz ${styles.kontynuuj}`}>
      <span className="wiersz-tresc">
        <span className="kicker">Kontynuuj</span>
        <span className="h3">{nazwaArkusza(a)}</span>
        <span className="wiersz-opis">{liczOdpowiedzi(zaczety.data.odpowiedzi)} z {a.pytan} odpowiedzi</span>
      </span>
      <span className="wiersz-akcja"><ChevronRight size={20} aria-hidden="true" /></span>
    </Link>
  );
}

const nazwaArkusza = (a: ArkuszWpis) => `${nazwaKrotka(idPrzedmiotu(a))} · ${nazwaSesji(a).replace(/^./, (c) => c.toLowerCase())}`;

const wielka = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Jeden arkusz: sesja z rokiem, część (gdy sesja ma kilka arkuszy), stan i wynik. */
function Wiersz({ arkusz: a }: { arkusz: ArkuszWpis }) {
  const postep = wczytajPostep(a.id);
  const zaczety = Object.keys(postep.odpowiedzi).length > 0;
  const proc = postep.wynik && postep.wynik.mozliwe > 0 ? Math.round((postep.wynik.zdobyte / postep.wynik.mozliwe) * 100) : null;
  return (
    <li>
      <Link to={`/arkusze/${a.id}`} className="wiersz" title={a.symbol} onPointerEnter={() => rozgrzejArkusz(a.id)} onFocus={() => rozgrzejArkusz(a.id)} onTouchStart={() => rozgrzejArkusz(a.id)}>
        <span className="wiersz-tresc">
          <span className={styles.nazwa}>
            <span className="h3">{wielka(a.sesja)} {a.rok}</span>
            {a.czesc && <span className="wiersz-opis">{a.czesc}</span>}
          </span>
        </span>
        <span className="wiersz-wartosc">
          {proc !== null ? <Pierscien wartosc={proc / 100} prog={a.poziom === "podstawowy" ? 0.3 : undefined} rozmiar={44} opis={`Wynik ${proc}%`} /> : zaczety ? <span className="muted">w trakcie</span> : <span className="muted">nierozwiązany</span>}
        </span>
        <span className="wiersz-akcja"><ChevronRight size={20} aria-hidden="true" /></span>
      </Link>
    </li>
  );
}

// Wspólne dane arkuszy z grupy (czas, punkty, nagranie) idą do nagłówka zamiast na każdą kartę.
function opisGrupy(arkusze: ArkuszWpis[]): string[] {
  const zakres = (w: number[], jednostka: string) => {
    if (!w.length) return null;
    const min = Math.min(...w);
    const max = Math.max(...w);
    return min === max ? `${min} ${jednostka}` : `${min}–${max} ${jednostka}`;
  };
  const czas = zakres(arkusze.flatMap((a) => (a.czas ? [a.czas] : [])), "min");
  const punkty = zakres(arkusze.map((a) => a.punkty), "pkt");
  const nagranie = arkusze.some((a) => a.przedmiot === "angielski");
  const pliki = arkusze.some((a) => a.przedmiot === "informatyka");
  return [czas, punkty, nagranie ? "z nagraniem" : null, pliki ? "z plikami danych" : null].filter((x): x is string => !!x);
}

function BrakDanych({ blad }: { blad: string }) {
  return (
    <section className={styles.empty}>
      <h2 className="h3">{blad === "brak-danych" ? "Nie ma jeszcze zaimportowanych arkuszy" : "Nie udało się wczytać arkuszy"}</h2>
      <p className="muted">Arkusze CKE nie są częścią repozytorium. Pobierz je, przetwórz i wgraj do bazy z katalogu głównego projektu, a potem odśwież stronę:</p>
      <pre className={styles.code}>npm run pobierz{"\n"}npm run importuj</pre>
      {blad !== "brak-danych" && <p className="small muted">Szczegóły: {blad}</p>}
    </section>
  );
}
