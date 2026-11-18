// Układ pulpitu: gotowe układy i lista widgetów (włącz, wyłącz, przeciągnij albo przesuń strzałkami).
// Edytuje układ przedmiotu wybranego na pulpicie (?przedmiot=), a zmiany widać od razu. Dane: konto/ukladPulpitu.ts.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { GripVertical } from "lucide-react";
import { useProfil } from "../auth";
import { przedmiot, zgrupuj } from "../konto/przedmioty";
import { WSZYSTKIE, nazwaUkladu, przelaczWidget, przesunWidgetO, przywrocUklad, ustawGotowy, ustawKolejnosc, useBladUkladu, useUklad, type Pozycja, type Uklad } from "../konto/ukladPulpitu";
import { Ladowanie } from "../components/Ladowanie";
import { WIDGETY, widget } from "./pulpit/widgety";
import { NaglowekStrony } from "../components/NaglowekStrony";
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
  // Podczas przeciągania widać szkic kolejności; na konto idzie dopiero po upuszczeniu.
  const [szkic, setSzkic] = useState<Pozycja[] | null>(null);
  const przeciagany = useRef<{ id: string; pointerId: number; start: Pozycja[] } | null>(null);
  const [trzymany, setTrzymany] = useState<string | null>(null);
  const wiersze = useRef(new Map<string, HTMLLIElement>());
  const uchwyty = useRef(new Map<string, HTMLButtonElement>());
  const zFokusem = useRef<string | null>(null);
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
      <main className="container" style={{ paddingTop: 32, paddingBottom: 120, display: "grid", gap: 40 }}>
        <NaglowekStrony etykieta="Profil" tytul="Układ pulpitu" lead="Wybór i kolejność widgetów na pulpicie." />
        <Ladowanie ksztalt="wiersze" ile={3} etykieta="Wczytuję twoje przedmioty" />
      </main>
    );

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 120, display: "grid", gap: 40 }}>
      <NaglowekStrony etykieta="Profil" tytul="Układ pulpitu" lead="Wybór i kolejność widgetów na pulpicie." />

      <section className={s.sekcja}>
        <span className="label">Pulpit</span>
        <div className="pigulki" role="group" aria-label="Przedmiot, którego pulpit układasz">
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
        </div>
        <p className="muted small">Zmiany dotyczą pulpitu: {nazwaPrzedmiotu}. Każdy przedmiot ma własny układ.</p>
      </section>

      <section className={s.sekcja}>
        <span className="label">Układ</span>
        <div className="pigulki" role="group" aria-label="Gotowe układy">
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
