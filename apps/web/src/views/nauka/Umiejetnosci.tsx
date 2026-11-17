import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import type { Poziom } from "../../arkusze/typy";
import { useProfil } from "../../auth";
import { Ladowanie } from "../../components/Ladowanie";
import { PRZEDMIOTY, nazwaPoziomu, przedmiot } from "../../konto/przedmioty";
import { adresMapy, adresNauki, adresRozbioru } from "../../nauka/adresy";
import { naukaApi, type DowodNauki, type Umiejetnosc } from "../../nauka/api";
import { czyPoziomNauki, poziomyNauki, usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import { Opanowanie } from "./Opanowanie";
import s from "./Umiejetnosci.module.css";

const OBSZARY = [
  { id: "słuchanie", nazwa: "Rozumienie ze słuchu" },
  { id: "czytanie", nazwa: "Rozumienie tekstów pisanych" },
  { id: "środki językowe", nazwa: "Środki językowe" },
  { id: "pisanie", nazwa: "Wypowiedź pisemna" },
];

const dataProby = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeZone: "Europe/Warsaw" });

function Dowod({ dowod: d }: { dowod: DowodNauki }) {
  const rok = d.sheet_id?.match(/-(\d{4})-maj$/)?.[1];
  const numerZadania = d.question.split(".")[0];
  const adres = d.session_id
    ? adresRozbioru(d.session_id)
    : d.sheet_id && `/arkusze/${encodeURIComponent(d.sheet_id)}#zadanie-${numerZadania}`;
  const nazwa = d.session_id ? `Sesja nauki · zadanie ${d.question}` : `Arkusz${rok ? ` maj ${rok}` : ""} · zadanie ${d.question}`;
  const wynik = d.score >= 1 ? "Dobrze" : d.score <= 0 ? "Błąd" : `${Math.round(d.score * 100)}%`;
  return (
    <li className={s.dowod}>
      <span className={s.nazwa}>
        {adres ? <Link to={adres}>{nazwa}</Link> : <span>{nazwa}</span>}
        <span className="muted small">
          <time dateTime={d.happened_at}>{dataProby.format(new Date(d.happened_at))}</time>
          {!!d.hint_level && ` · użyte podpowiedzi: ${d.hint_level}`}
        </span>
      </span>
      <span className={`small ${d.score >= 1 ? s.dobrze : d.score <= 0 ? s.zle : "muted"}`}>{wynik}</span>
    </li>
  );
}

function PanelUmiejetnosci({ poziom, umiejetnosc: u }: { poziom: Poziom; umiejetnosc: Umiejetnosc }) {
  const naglowek = useRef<HTMLHeadingElement>(null);
  const proby = useZapytanieNauki(`dowody:${poziom}:${u.skill_id}`, (signal) => naukaApi.dowody(u.skill_id, poziom, signal));
  const maBledyJezykowe = proby.dane?.some((d) => d.score < 1 && d.error_type === "jezyk-i-forma");

  useEffect(() => {
    naglowek.current?.focus();
  }, [u.skill_id]);

  return (
    <aside className={s.panel} aria-labelledby="umiejetnosc-tytul">
      <Link to={adresMapy(poziom)} className={s.wroc}><ArrowLeft size={16} aria-hidden="true" /> Wszystkie umiejętności</Link>
      <div className={s.blok}>
        <h2 id="umiejetnosc-tytul" className="h2" tabIndex={-1} ref={naglowek}>{u.name}</h2>
        <p>{u.description}</p>
        <Opanowanie {...u} />
        <p className="muted small">Próby uwzględnione w ocenie: {u.evidence_count}</p>
      </div>
      <section className={s.blok} aria-labelledby="umiejetnosc-proby">
        <h3 id="umiejetnosc-proby" className="h3">Ostatnie próby</h3>
        {proby.stan === "ladowanie" && <Ladowanie ile={3} etykieta="Wczytuję próby" />}
        {proby.stan === "blad" && <Blad tekst="Nie udało się wczytać prób." ponow={proby.ponow} />}
        {proby.stan === "gotowe" && (proby.dane?.length ? (
          <ul className={s.wiersze}>
            {proby.dane.map((d) => <Dowod key={`${d.source_id}:${d.session_id ?? d.sheet_id}:${d.question}`} dowod={d} />)}
          </ul>
        ) : <p className="muted">Sprawdź zadania w arkuszu albo ukończ rundę, żeby zobaczyć tu pierwsze próby.</p>)}
        {maBledyJezykowe && <p className="small muted">W ostatnich próbach pojawiły się błędy językowe i dotyczące formy.</p>}
      </section>
      <Link to={adresNauki(poziom, u.skill_id)} className={`btn btn-primary ${s.przycisk}`}>Ćwicz <ArrowRight size={16} aria-hidden="true" /></Link>
    </aside>
  );
}

function Blad({ tekst, ponow }: { tekst: string; ponow: () => void }) {
  return (
    <div className={s.blok}>
      <p role="alert">{tekst}</p>
      <button type="button" className={`btn btn-ghost btn-sm ${s.przycisk}`} onClick={ponow}>Spróbuj ponownie</button>
    </div>
  );
}

export function Umiejetnosci() {
  const [parametry] = useSearchParams();
  const profil = useProfil();
  const [poziom, ustawPoziom] = usePoziomNauki();
  const wybranyPrzedmiot = przedmiot(parametry.get("przedmiot") ?? "angielski")?.id ?? "angielski";
  const angielski = wybranyPrzedmiot === "angielski";
  const przedmioty = PRZEDMIOTY.filter((p) => p.id === "angielski" || p.id === wybranyPrzedmiot || profil?.subjects.some((w) => w.id === p.id));
  const mapa = useZapytanieNauki(angielski ? `mapa:${poziom}` : null, (signal) => naukaApi.mapa(poziom, signal));
  const umiejetnosci = mapa.dane?.skills;
  const id = parametry.get("umiejetnosc");
  const wybrana = umiejetnosci?.find((u) => u.skill_id === id);
  const ostatniPanel = useRef<string | null>(null);

  useEffect(() => {
    if (wybrana) ostatniPanel.current = wybrana.skill_id;
    else if (ostatniPanel.current && !id && mapa.stan === "gotowe") {
      document.getElementById(`umiejetnosc-${ostatniPanel.current}`)?.focus();
      ostatniPanel.current = null;
    }
  }, [wybrana, id, mapa.stan]);

  return (
    <main className={`container ${s.strona}`} data-panel={!!wybrana}>
      <header className={s.glowa}>
        <h1 className="display">Mapa umiejętności</h1>
        <p className="muted">Zobacz, jak radzisz sobie z poszczególnymi wymaganiami matury.</p>
      </header>
      <div className={s.filtry}>
        <nav className={s.chipy} aria-label="Przedmioty">
          {przedmioty.map((p) => (
            <Link key={p.id} to={p.id === "angielski" ? adresMapy(poziom) : `${adresMapy(poziom)}&przedmiot=${p.id}`} className={s.chip} aria-current={p.id === wybranyPrzedmiot ? "page" : undefined}>
              {p.nazwa}
            </Link>
          ))}
        </nav>
        {angielski && (
          <label>
            <span className="small">Poziom matury</span>
            <select value={poziom} onChange={(e) => {
              const nowy = e.currentTarget.value;
              if (czyPoziomNauki(nowy)) ustawPoziom(nowy);
            }}>
              {poziomyNauki.map((p) => <option value={p} key={p}>{nazwaPoziomu[p]}</option>)}
            </select>
          </label>
        )}
      </div>
      {!angielski && (
        <div className={s.blok}>
          <p className="muted">Mapa jest dostępna dla języka angielskiego.</p>
          <Link to={adresMapy(poziom)} className={`link ${s.przycisk}`}>Przejdź do mapy angielskiego <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
      )}
      {mapa.stan === "ladowanie" && <Ladowanie etykieta="Wczytuję mapę umiejętności" />}
      {mapa.stan === "blad" && <Blad tekst="Nie udało się wczytać mapy umiejętności." ponow={mapa.ponow} />}
      {angielski && umiejetnosci && (
        <div className={s.uklad} data-panel={!!wybrana}>
          <div className={s.grupy}>
            {id && !wybrana && <p role="status">Tej umiejętności nie ma w mapie.</p>}
            {OBSZARY.map(({ id: obszar, nazwa }, i) => {
              const wObszarze = umiejetnosci.filter((u) => u.area === obszar);
              return wObszarze.length > 0 && (
                <section className={s.blok} aria-labelledby={`obszar-${i}`} key={obszar}>
                  <h2 className="h2" id={`obszar-${i}`}>{nazwa}</h2>
                  <ul className={s.wiersze}>
                    {wObszarze.map((u) => (
                      <li key={u.skill_id}>
                        <Link id={`umiejetnosc-${u.skill_id}`} to={adresMapy(poziom, u.skill_id)} className={s.wiersz} aria-current={u.skill_id === id ? "true" : undefined}>
                          <span className={s.nazwa}>{u.name}<span className={`${s.kody} small`}>{u.codes.join(" · ")}</span></span>
                          <Opanowanie {...u} />
                          <ChevronRight className={s.wskaznik} size={18} aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          {wybrana && <PanelUmiejetnosci poziom={poziom} umiejetnosc={wybrana} />}
        </div>
      )}
    </main>
  );
}
