import {
  kontrastWSystemie,
  ruchWSystemie,
  useUstawienia,
  zmienUstawienia,
  type Motyw,
  type Tekst,
} from "../konto/ustawienia";
import s from "./Ustawienia.module.css";

const MOTYWY: { id: Motyw; nazwa: string }[] = [
  { id: "system", nazwa: "Jak system" },
  { id: "jasny", nazwa: "Jasny" },
  { id: "ciemny", nazwa: "Ciemny" },
];

const TEKSTY: { id: Tekst; nazwa: string }[] = [
  { id: "maly", nazwa: "Tekst mniejszy" },
  { id: "normalny", nazwa: "Normalny" },
  { id: "duzy", nazwa: "Większy" },
];

function Wybor<T extends string>({ opis, opcje, wartosc, onChange }: { opis: string; opcje: { id: T; nazwa: string }[]; wartosc: T; onChange: (v: T) => void }) {
  return (
    <div className={s.chipy} role="group" aria-label={opis}>
      {opcje.map((o) => (
        <button key={o.id} type="button" className={`${s.chip} ${o.id === wartosc ? s.chipAktywny : ""}`} aria-pressed={o.id === wartosc} onClick={() => onChange(o.id)}>
          {o.nazwa}
        </button>
      ))}
    </div>
  );
}

function Przelacznik({ tytul, opis, wl, onChange }: { tytul: string; opis: string; wl: boolean; onChange: (v: boolean) => void }) {
  return (
    <li className={s.wiersz}>
      <span>
        {tytul}
        <br />
        <span className="muted small">{opis}</span>
      </span>
      <button type="button" role="switch" aria-checked={wl} aria-label={tytul} className={`${s.przelacznik} ${wl ? s.przelacznikWl : ""}`} onClick={() => onChange(!wl)} />
    </li>
  );
}

export function Ustawienia() {
  const u = useUstawienia();

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 120, display: "grid", gap: 40 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <span className="label">Profil</span>
        <h1 className="display">Ustawienia</h1>
      </div>

      <section className={s.sekcja}>
        <h2 className="h2">Wygląd</h2>
        <Wybor opis="Motyw" opcje={MOTYWY} wartosc={u.motyw} onChange={(motyw) => zmienUstawienia({ motyw })} />
        <Wybor opis="Rozmiar tekstu" opcje={TEKSTY} wartosc={u.tekst} onChange={(tekst) => zmienUstawienia({ tekst })} />
      </section>

      <section className={s.sekcja}>
        <h2 className="h2">Dostępność</h2>
        <ul className={s.wiersze}>
          <Przelacznik tytul="Mniej ruchu" opis="Bez animacji Pestki i przejść" wl={u.mniejRuchu ?? ruchWSystemie()} onChange={(v) => zmienUstawienia({ mniejRuchu: v === ruchWSystemie() ? null : v })} />
          <Przelacznik tytul="Większy kontrast" opis="Ciemniejszy tekst pomocniczy i linie" wl={u.kontrast ?? kontrastWSystemie()} onChange={(v) => zmienUstawienia({ kontrast: v === kontrastWSystemie() ? null : v })} />
        </ul>
      </section>

      <section className={s.sekcja}>
        <h2 className="h2">Pestka</h2>
        <ul className={s.wiersze}>
          <Przelacznik tytul="Sama podpowiada" opis="Wskazówki przy elementach strony" wl={u.pestkaSama} onChange={(pestkaSama) => zmienUstawienia({ pestkaSama })} />
          <Przelacznik tytul="Krótkie odpowiedzi" opis="Najwyżej kilka zdań naraz" wl={u.pestkaKrotko} onChange={(pestkaKrotko) => zmienUstawienia({ pestkaKrotko })} />
        </ul>
      </section>
    </main>
  );
}
