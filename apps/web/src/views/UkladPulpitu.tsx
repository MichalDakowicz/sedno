// Układ pulpitu: gotowe układy i lista widgetów (włącz, wyłącz, przeciągnij albo przesuń strzałkami).
// Edytuje układ przedmiotu wybranego na pulpicie (?przedmiot=), a zmiany widać od razu. Dane: konto/ukladPulpitu.ts.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GripVertical } from "lucide-react";
import { useProfil } from "../auth";
import { przedmiot, zgrupuj } from "../konto/przedmioty";
import { WSZYSTKIE, nazwaUkladu, przelaczWidget, przesunWidget, przesunWidgetO, przywrocUklad, ustawGotowy, useBladUkladu, useUklad, type Uklad } from "../konto/ukladPulpitu";
import { WIDGETY, widget } from "./pulpit/widgety";
import s from "./UkladPulpitu.module.css";

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
  const [przeciagany, setPrzeciagany] = useState<string | null>(null);
  const wiersze = useRef(new Map<string, HTMLLIElement>());
  const uchwyty = useRef(new Map<string, HTMLButtonElement>());
  const zFokusem = useRef<string | null>(null);
  // Najświeższa lista dla nasłuchu na window, który nie odświeża się razem z renderem.
  const biezaca = useRef(lista);
  biezaca.current = lista;

  const ogloszPozycje = (id: string, indeks: number) =>
    setOgloszenie(`${widget(id)!.nazwa}: pozycja ${STALE.length + indeks + 1} z ${STALE.length + lista.length}`);

  function przesun(id: string, doIndeksu: number) {
    const z = biezaca.current.findIndex((p) => p.id === id);
    const na = Math.max(0, Math.min(biezaca.current.length - 1, doIndeksu));
    if (na !== z) przesunWidget(klucz, id, na);
    return na;
  }

  // Po przesunięciu klawiszem uchwyt zostaje w fokusie, nawet gdy przeglądarka zgubiła go przy przestawieniu wiersza.
  useEffect(() => {
    if (!zFokusem.current) return;
    uchwyty.current.get(zFokusem.current)?.focus();
    zFokusem.current = null;
  });

  function klawisz(e: KeyboardEvent, id: string, i: number) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const delta = e.key === "ArrowUp" ? -1 : 1;
    const na = Math.max(0, Math.min(biezaca.current.length - 1, i + delta));
    przesunWidgetO(klucz, id, delta);
    zFokusem.current = id;
    ogloszPozycje(id, na);
  }

  function start(e: PointerEvent, id: string) {
    if (e.button !== 0) return;
    e.preventDefault();
    setPrzeciagany(id);
  }

  // Przeciąganie słucha okna, bo przestawiany wiersz jest w trakcie przenoszony w drzewie i tracił by przechwycony wskaźnik.
  useEffect(() => {
    if (!przeciagany) return;
    const id = przeciagany;
    const ruch = (e: globalThis.PointerEvent) => {
      const ids = biezaca.current.map((p) => p.id);
      let cel = ids.length - 1;
      for (let i = 0; i < ids.length; i++) {
        const r = wiersze.current.get(ids[i]!)?.getBoundingClientRect();
        if (r && e.clientY < r.top + r.height / 2) {
          cel = i;
          break;
        }
      }
      if (cel !== ids.indexOf(id)) {
        przesun(id, cel);
        ogloszPozycje(id, cel);
      }
    };
    const koniec = () => setPrzeciagany(null);
    window.addEventListener("pointermove", ruch);
    window.addEventListener("pointerup", koniec);
    window.addEventListener("pointercancel", koniec);
    return () => {
      window.removeEventListener("pointermove", ruch);
      window.removeEventListener("pointerup", koniec);
      window.removeEventListener("pointercancel", koniec);
    };
  }, [przeciagany, klucz]);

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 120, display: "grid", gap: 40 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <span className="label">Profil</span>
        <h1 className="display">Układ pulpitu</h1>
        <p className="lead">Wybór i kolejność widgetów na pulpicie.</p>
      </div>

      <section className={s.sekcja}>
        <span className="label">Pulpit</span>
        <div className={s.chipy} role="group" aria-label="Przedmiot, którego pulpit układasz">
          {[{ id: WSZYSTKIE, nazwa: "Wszystkie" }, ...moje.map((m) => ({ id: m.id as string, nazwa: przedmiot(m.id)!.nazwa }))].map((o) => (
            <button
              key={o.id}
              type="button"
              className={`${s.chip} ${o.id === klucz ? s.chipAktywny : ""}`}
              aria-pressed={o.id === klucz}
              onClick={() => setParams(o.id === WSZYSTKIE ? {} : { przedmiot: o.id }, { replace: true })}
            >
              {o.nazwa}
            </button>
          ))}
        </div>
        <p className="muted small">Zmiany dotyczą pulpitu: {nazwaPrzedmiotu}. Każdy przedmiot ma własny układ.</p>
      </section>

      <section className={s.sekcja}>
        <span className="label">Układ</span>
        <div className={s.chipy} role="group" aria-label="Gotowe układy">
          {UKLADY.map((u) => (
            <button
              key={u.id}
              type="button"
              className={`${s.chip} ${u.id === aktywnyUklad ? s.chipAktywny : ""}`}
              aria-pressed={u.id === aktywnyUklad}
              // „Własny” włącza się sam, gdy uczeń zmieni listę; nie ma do czego go wybierać.
              disabled={u.id === "wlasny" && aktywnyUklad !== "wlasny"}
              onClick={() => u.id !== "wlasny" && ustawGotowy(klucz, u.id)}
            >
              {u.nazwa}
            </button>
          ))}
        </div>
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
              <button type="button" role="switch" aria-checked="true" aria-label={w.nazwa} disabled className={`${s.przelacznik} ${s.przelacznikWl} ${s.przelacznikStaly}`} />
            </li>
          ))}
          {lista.map((p, i) => {
            const w = widget(p.id)!;
            return (
              <li
                key={p.id}
                ref={(el) => {
                  if (el) wiersze.current.set(p.id, el);
                  else wiersze.current.delete(p.id);
                }}
                className={`${s.wiersz} ${przeciagany === p.id ? s.przeciagany : ""}`}
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
                <button type="button" role="switch" aria-checked={p.wl} aria-label={w.nazwa} className={`${s.przelacznik} ${p.wl ? s.przelacznikWl : ""}`} onClick={() => przelaczWidget(klucz, p.id)} />
              </li>
            );
          })}
        </ul>
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
