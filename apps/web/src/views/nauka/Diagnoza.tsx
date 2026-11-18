// Diagnoza na start (nauka/diagnoza.ts): po jednej szybkiej rundzie z każdego obszaru, potem pierwsze wyniki
// na mapie i propozycja dnia. Można pominąć i wrócić z pulpitu.
import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, ChevronRight, Circle } from "lucide-react";
import { KartaDnia } from "../../components/KartaDnia";
import { Ladowanie } from "../../components/Ladowanie";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { adresMapy, adresStartu } from "../../nauka/adresy";
import { naukaApi } from "../../nauka/api";
import { krokiDiagnozy, useDiagnoza, zmienDiagnoze } from "../../nauka/diagnoza";
import { useDzisAngielski } from "../../nauka/dzis";
import { usePoziomNauki, useZapytanieNauki } from "../../nauka/stan";
import { BladNauki, WyborPoziomuNauki } from "./NaukaPowtorki";
import { Opanowanie } from "./Opanowanie";
import s from "./NaukaPowtorki.module.css";

export function Diagnoza() {
  const stan = useDiagnoza();
  const [wybranyPoziom, ustawPoziom] = usePoziomNauki();
  // Po starcie poziom zostaje ten z diagnozy, żeby kroki i wyniki dotyczyły jednego poziomu.
  const poziom = stan.od !== null && stan.poziom ? stan.poziom : wybranyPoziom;
  const mapa = useZapytanieNauki(`nauka:mapa:${poziom}`, (signal) => naukaApi.mapa(poziom, signal));
  const kroki = mapa.dane ? krokiDiagnozy(mapa.dane.skills, stan) : [];
  const nastepny = kroki.find((k) => !k.zrobiony);
  const gotowe = stan.od !== null && kroki.length > 0 && !nastepny;
  const dzien = useDzisAngielski(poziom);
  const nawiguj = useNavigate();
  const tytul = useRef<HTMLHeadingElement>(null);

  // Wszystkie kroki zrobione: podsumowanie widać raz, potem pulpit nie proponuje już diagnozy.
  useEffect(() => {
    if (gotowe && !stan.koniec) {
      zmienDiagnoze({ koniec: true });
      tytul.current?.focus();
    }
  }, [gotowe, stan.koniec]);

  function zacznij() {
    if (!nastepny) return;
    if (stan.od === null) zmienDiagnoze({ od: Date.now(), poziom, kroki: kroki.map((k) => k.umiejetnosc.skill_id), pominieta: false, koniec: false });
    nawiguj(adresStartu(poziom, nastepny.umiejetnosc.skill_id));
  }

  function pomin() {
    zmienDiagnoze({ pominieta: true });
    nawiguj("/");
  }

  return (
    <main className={`container ${s.strona}`}>
      <NaglowekStrony wstecz={{ do: "/nauka", nazwa: "Nauka" }} tytul={gotowe ? "Pierwsze wyniki" : "Od czego zacząć"} tytulRef={tytul} lead={gotowe ? "Tak wygląda start na mapie umiejętności." : "Po jednej krótkiej rundzie z każdego obszaru."} />

      {stan.od === null && (
        <div className={s.sekcja}>
          <WyborPoziomuNauki poziom={poziom} ustawPoziom={ustawPoziom} />
        </div>
      )}

      {mapa.stan === "ladowanie" && <Ladowanie etykieta="Wczytuję umiejętności" />}
      {mapa.stan === "blad" && <BladNauki komunikat="Nie udało się wczytać umiejętności." ponow={mapa.ponow} />}

      {kroki.length > 0 && (
        <section className={s.sekcja} aria-labelledby="kroki-diagnozy">
          <h2 className="h2" id="kroki-diagnozy">{gotowe ? "Obszary" : `Rundy: ${kroki.filter((k) => k.zrobiony).length} z ${kroki.length}`}</h2>
          <ol className={`wiersze ${s.kroki}`}>
            {kroki.map((k) => (
              <li key={k.obszar.id}>
                <Link to={adresMapy(poziom, k.umiejetnosc.skill_id)} className="wiersz">
                  <span className={`wiersz-ikona ${s.ikona}`} data-zrobiony={k.zrobiony || undefined}>
                    {k.zrobiony ? <Check size={18} aria-label="Zrobione" /> : <Circle size={14} aria-label={k === nastepny ? "Teraz" : "Czeka"} />}
                  </span>
                  <span className="wiersz-tresc">
                    <span className="h3">{k.obszar.nazwa}</span>
                    <span className="wiersz-opis">{k.umiejetnosc.name}</span>
                  </span>
                  <span className="wiersz-wartosc">
                    {k.zrobiony ? <Opanowanie {...k.umiejetnosc} /> : <span className="muted">{k === nastepny ? "teraz" : "czeka"}</span>}
                  </span>
                  <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!gotowe && nastepny && (
        <div className={s.akcje}>
          <button type="button" className={`btn btn-primary ${s.przycisk}`} onClick={zacznij}>
            {stan.od === null ? "Zacznij" : `Dalej: ${nastepny.obszar.nazwa}`} <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-ghost" onClick={pomin}>Pomiń</button>
        </div>
      )}

      {gotowe && (
        <>
          {dzien.stan === "ladowanie" ? <Ladowanie ksztalt="blok" etykieta="Dobieram ćwiczenie na dziś" /> : dzien.dzis && <KartaDnia dzis={dzien.dzis} />}
          <div className={s.akcje}>
            <Link to={adresMapy(poziom)} className="link">Cała mapa umiejętności <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
        </>
      )}
      {mapa.stan === "gotowe" && !kroki.length && (
        <div className={s.stan}>
          <p className="muted">Na tym poziomie nie ma jeszcze rund do diagnozy.</p>
          <Link to="/arkusze?przedmiot=angielski" className={`btn btn-secondary ${s.przycisk}`}>Rozwiąż arkusz</Link>
        </div>
      )}
    </main>
  );
}
