// Układ pulpitu: gotowe układy i lista widgetów (włącz, wyłącz, przeciągnij albo przesuń strzałkami).
// Edytuje układ przedmiotu wybranego na pulpicie (?przedmiot=), a zmiany widać od razu. Dane: konto/ukladPulpitu.ts.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GripVertical } from "lucide-react";
import { useProfil } from "../auth";
import { przedmiot, zgrupuj } from "../konto/przedmioty";
import { WSZYSTKIE, nazwaUkladu, przelaczWidget, przesunWidgetO, przywrocUklad, ustawGotowy, ustawKolejnosc, useBladUkladu, useUklad, type Pozycja, type Uklad } from "../konto/ukladPulpitu";
import { Ladowanie } from "../components/Ladowanie";
import { WIDGETY, widget } from "./pulpit/widgety";
import { NaglowekStrony } from "../components/NaglowekStrony";
import s from "./UkladPulpitu.module.css";
import { Pigulki } from "../components/Pigulki";
import { CZAS, mniejRuchu, sprezyna } from "../ruch";

const UKLADY: { id: Uklad; nazwa: string }[] = [
  { id: "nauka", nazwa: "Nauka" },
  { id: "egzamin", nazwa: "Egzamin" },
  { id: "wlasny", nazwa: "Własny" },
];

const STALE = WIDGETY.filter((w) => w.staly);

export function UkladPulpitu() {
  const profil = useProfil();
  const [params, setParams] = useSearchParams();
  const moje = zgrupuj(profil?.subjects ?? []);
  const wskazany = params.get("przedmiot");
  const klucz = moje.some((m) => m.id === wskazany) ? wskazany! : WSZYSTKIE;
  const nazwaPrzedmiotu = klucz === WSZYSTKIE ? "Wszystkie" : przedmiot(klucz)!.nazwa;

  const lista = useUklad(klucz);
  const blad = useBladUkladu();
  const aktywnyUklad = nazwaUkladu(lista);

  const [ogloszenie, setOgloszenie] = useState("");
  // Podczas przeciągania widać szkic kolejności; na konto idzie dopiero po upuszczeniu.
  const [szkic, setSzkic] = useState<Pozycja[] | null>(null);
  const przeciagany = useRef<{ id: string; pointerId: number; start: Pozycja[] } | null>(null);
  const [trzymany, setTrzymany] = useState<string | null>(null);
  const wiersze = useRef(new Map<string, HTMLLIElement>());
  const uchwyty = useRef(new Map<string, HTMLButtonElement>());
  const zFokusem = useRef<string | null>(null);
  // Ruch przy przeciąganiu: trzymany wiersz jedzie za palcem (transform, bez Reacta co klatkę), sąsiedzi rozjeżdżają się
  // sprężyście, a po puszczeniu wiersz dociąga się do miejsca z prędkością, z jaką go rzucono.
  const palec = useRef<{ startY: number; startTop: number; y: number; v: number; t: number; klatka: number } | null>(null);
  const pozycje = useRef(new Map<string, number>());
  const zatrzymajPowrot = useRef<() => void>(() => {});
  const widoczna = szkic ?? lista;
  // Najświeższa lista dla nasłuchu na window, który nie odświeża się razem z renderem.
  const biezaca = useRef(widoczna);
  biezaca.current = widoczna;

  const ogloszPozycje = (id: string, indeks: number, razem: number) =>
    setOgloszenie(`${widget(id)!.nazwa}: pozycja ${STALE.length + indeks + 1} z ${STALE.length + razem}`);

  // Po przesunięciu klawiszem uchwyt zostaje w fokusie, nawet gdy przeglądarka zgubiła go przy przestawieniu wiersza.
  useEffect(() => {
    if (!zFokusem.current) return;
    uchwyty.current.get(zFokusem.current)?.focus();
    zFokusem.current = null;
  });

  // Wiersz trzymany stoi pod palcem: przesunięcie = ruch palca minus to, o ile wiersz przeskoczył w liście.
  const ustawTrzymany = () => {
    const p = palec.current;
    const el = przeciagany.current && wiersze.current.get(przeciagany.current.id);
    if (!p || !el || mniejRuchu()) return;
    el.style.transform = `translateY(${p.y - p.startY - (el.offsetTop - p.startTop)}px)`;
  };

  // FLIP: wiersze, które zmieniły miejsce w liście, ruszają z poprzedniej pozycji do nowej sprężyną z tokenów.
  useLayoutEffect(() => {
    const bezRuchu = mniejRuchu();
    const sprezysta = getComputedStyle(document.documentElement).getPropertyValue("--ruch-sprezyna").trim() || "ease-out";
    for (const [id, el] of wiersze.current) {
      const teraz = el.offsetTop;
      const wczesniej = pozycje.current.get(id);
      pozycje.current.set(id, teraz);
      if (bezRuchu || wczesniej === undefined || wczesniej === teraz || id === przeciagany.current?.id) continue;
      el.animate([{ transform: `translateY(${wczesniej - teraz}px)` }, { transform: "none" }], { duration: CZAS.zwykly, easing: sprezysta });
    }
    ustawTrzymany();
  });

  function klawisz(e: KeyboardEvent, id: string, i: number) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const delta = e.key === "ArrowUp" ? -1 : 1;
    const na = i + delta;
    if (na < 0 || na >= lista.length) {
      setOgloszenie(`${widget(id)!.nazwa}: już na ${delta < 0 ? "górze" : "dole"}`);
      return;
    }
    przesunWidgetO(klucz, id, delta);
    zFokusem.current = id;
    ogloszPozycje(id, na, lista.length);
  }

  function start(e: PointerEvent, id: string) {
    if (e.button !== 0 || przeciagany.current) return;
    e.preventDefault();
    // preventDefault wstrzymuje domyślne ustawienie fokusu, a strzałki mają działać zaraz po kliknięciu.
    (e.currentTarget as HTMLElement).focus({ preventScroll: true });
    przeciagany.current = { id, pointerId: e.pointerId, start: lista };
    zatrzymajPowrot.current();
    const wiersz = wiersze.current.get(id);
    if (wiersz) wiersz.style.transform = "";
    palec.current = { startY: e.pageY, startTop: wiersz?.offsetTop ?? 0, y: e.pageY, v: 0, t: performance.now(), klatka: 0 };
    setSzkic(lista);
    setTrzymany(id);
  }

  // Przeciąganie słucha okna, bo przestawiany wiersz jest w trakcie przenoszony w drzewie i tracił by przechwycony wskaźnik.
  useEffect(() => {
    if (!trzymany) return;
    const HISTEREZA = 6;
    const srodek = (id: string | undefined) => {
      const r = id ? wiersze.current.get(id)?.getBoundingClientRect() : undefined;
      return r ? r.top + r.height / 2 : null;
    };
    const ruch = (e: globalThis.PointerEvent) => {
      const p = przeciagany.current;
      if (!p || e.pointerId !== p.pointerId) return;
      const pa = palec.current;
      if (pa) {
        const t = performance.now();
        // Prędkość wygładzona, żeby jedno szarpnięcie przy puszczeniu nie rzucało wierszem.
        pa.v = 0.7 * ((e.pageY - pa.y) / Math.max(1, t - pa.t)) * 1000 + 0.3 * pa.v;
        pa.y = e.pageY;
        pa.t = t;
        if (!pa.klatka) pa.klatka = requestAnimationFrame(() => { pa.klatka = 0; ustawTrzymany(); });
      }
      const lista = biezaca.current;
      const i = lista.findIndex((x) => x.id === p.id);
      // Wiersz zamienia się z sąsiadem dopiero po przekroczeniu jego środka (z zapasem), tylko w kierunku ruchu.
      const gora = srodek(lista[i - 1]?.id);
      const dol = srodek(lista[i + 1]?.id);
      let na = i;
      if (gora !== null && e.clientY < gora - HISTEREZA) na = i - 1;
      else if (dol !== null && e.clientY > dol + HISTEREZA) na = i + 1;
      if (na === i) return;
      const nowa = [...lista];
      const [x] = nowa.splice(i, 1);
      nowa.splice(na, 0, x!);
      biezaca.current = nowa;
      setSzkic(nowa);
    };
    const zakoncz = (zapisz: boolean) => {
      const p = przeciagany.current;
      if (!p) return;
      przeciagany.current = null;
      const pa = palec.current;
      palec.current = null;
      const el = wiersze.current.get(p.id);
      if (pa) cancelAnimationFrame(pa.klatka);
      // Dociągnięcie do miejsca: od bieżącego przesunięcia do zera, z prędkością rzutu.
      if (el && pa) {
        const od = pa.y - pa.startY - (el.offsetTop - pa.startTop);
        zatrzymajPowrot.current = sprezyna({ od, do: 0, predkosc: pa.v, naKlatke: (x) => { el.style.transform = x ? `translateY(${x}px)` : ""; } });
      }
      const ids = biezaca.current.map((x) => x.id);
      const zmiana = ids.some((id, i) => id !== p.start[i]?.id);
      setTrzymany(null);
      setSzkic(null);
      if (zapisz && zmiana) {
        ustawKolejnosc(klucz, ids);
        ogloszPozycje(p.id, ids.indexOf(p.id), ids.length);
      }
    };
    const puszczono = (e: globalThis.PointerEvent) => {
      if (e.pointerId === przeciagany.current?.pointerId) zakoncz(true);
    };
    const anulowano = (e: globalThis.PointerEvent) => {
      if (e.pointerId === przeciagany.current?.pointerId) zakoncz(false);
    };
    const escape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") zakoncz(false);
    };
    window.addEventListener("pointermove", ruch);
    window.addEventListener("pointerup", puszczono);
    window.addEventListener("pointercancel", anulowano);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointermove", ruch);
      window.removeEventListener("pointerup", puszczono);
      window.removeEventListener("pointercancel", anulowano);
      window.removeEventListener("keydown", escape);
    };
  }, [trzymany, klucz]);

  const czekaNaProfil = !profil && !!wskazany;
  const pusty = lista.every((p) => !p.wl);

  // Odświeżenie strony z ?przedmiot=: bez profilu nie wiadomo jeszcze, czyj układ edytujemy.
  if (czekaNaProfil)
    return (
      <main className="container" style={{ paddingTop: "var(--s-6)", paddingBottom: 120, display: "grid", gap: "var(--s-6)" }}>
        <NaglowekStrony etykieta="Profil" tytul="Układ pulpitu" lead="Wybór i kolejność widgetów na pulpicie." />
        <Ladowanie ksztalt="wiersze" ile={3} etykieta="Wczytuję twoje przedmioty" />
      </main>
    );

  return (
    <main className="container" style={{ paddingTop: "var(--s-6)", paddingBottom: 120, display: "grid", gap: "var(--s-6)" }}>
      <NaglowekStrony etykieta="Profil" tytul="Układ pulpitu" lead="Wybór i kolejność widgetów na pulpicie." />

      <section className={s.sekcja}>
        <span className="label">Pulpit</span>
        <Pigulki role="group" aria-label="Przedmiot, którego pulpit układasz">
          {[{ id: WSZYSTKIE, nazwa: "Wszystkie" }, ...moje.map((m) => ({ id: m.id as string, nazwa: przedmiot(m.id)!.nazwa }))].map((o) => (
            <button
              key={o.id}
              type="button"
              className="pigulka"
              aria-pressed={o.id === klucz}
              onClick={() => setParams(o.id === WSZYSTKIE ? {} : { przedmiot: o.id }, { replace: true })}
            >
              {o.nazwa}
            </button>
          ))}
        </Pigulki>
        <p className="muted small">Pulpit: {nazwaPrzedmiotu}.</p>
      </section>

      <section className={s.sekcja}>
        <span className="label">Układ</span>
        <Pigulki role="group" aria-label="Gotowe układy">
          {UKLADY.map((u) => (
            <button
              key={u.id}
              type="button"
              className="pigulka"
              aria-pressed={u.id === aktywnyUklad}
              // „Własny” włącza się sam, gdy uczeń zmieni listę; nie ma do czego go wybierać.
              disabled={u.id === "wlasny" && aktywnyUklad !== "wlasny"}
              onClick={() => u.id !== "wlasny" && ustawGotowy(klucz, u.id)}
            >
              {u.nazwa}
            </button>
          ))}
        </Pigulki>
      </section>

      <section className={s.sekcja}>
        <h2 className="h2">Widgety</h2>
        <ul className={s.wiersze}>
          {STALE.map((w) => (
            <li key={w.id} className={s.wiersz}>
              <span className={s.opis}>
                <GripVertical size={18} aria-hidden="true" style={{ color: "var(--line)" }} />
                <span>
                  {w.nazwa}
                  <br />
                  <span className="muted small">zawsze na górze</span>
                </span>
              </span>
              <button type="button" role="switch" aria-checked="true" aria-label={w.nazwa} disabled className="przelacznik przelacznikWl" />
            </li>
          ))}
          {widoczna.map((p, i) => {
            const w = widget(p.id)!;
            return (
              <li
                key={p.id}
                ref={(el) => {
                  if (el) wiersze.current.set(p.id, el);
                  else wiersze.current.delete(p.id);
                }}
                className={`${s.wiersz} ${trzymany === p.id ? s.przeciagany : ""}`}
              >
                <span className={s.opis}>
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) uchwyty.current.set(p.id, el);
                      else uchwyty.current.delete(p.id);
                    }}
                    className={s.uchwyt}
                    aria-label={`Przesuń: ${w.nazwa}. Strzałki w górę i w dół zmieniają kolejność.`}
                    onPointerDown={(e) => start(e, p.id)}
                    onKeyDown={(e) => klawisz(e, p.id, i)}
                  >
                    <GripVertical size={18} aria-hidden="true" />
                  </button>
                  <span>
                    {w.nazwa}
                    <br />
                    <span className="muted small">{w.opis}</span>
                  </span>
                </span>
                <button type="button" role="switch" aria-checked={p.wl} aria-label={w.nazwa} className={`przelacznik ${p.wl ? "przelacznikWl" : ""}`} onClick={() => przelaczWidget(klucz, p.id)} />
              </li>
            );
          })}
        </ul>
        {pusty && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <p className="muted small">Na pulpicie zostanie tylko „Dziś warto”.</p>
            <button type="button" className="btn btn-secondary" onClick={() => ustawGotowy(klucz, "nauka")}>
              Wróć do układu Nauka
            </button>
          </div>
        )}
        <p className="visually-hidden" role="status" aria-live="polite">
          {ogloszenie}
        </p>
      </section>

      <div className={s.akcje}>
        <Link to={klucz === WSZYSTKIE ? "/" : `/przedmiot/${klucz}`} className="btn btn-primary">
          Zobacz pulpit
        </Link>
        <button type="button" className="btn btn-ghost" onClick={() => przywrocUklad(klucz)}>
          Przywróć domyślny
        </button>
      </div>

      {blad && <p className="muted small">Nie zapisano na koncie. Spróbuję ponownie.</p>}
    </main>
  );
}
