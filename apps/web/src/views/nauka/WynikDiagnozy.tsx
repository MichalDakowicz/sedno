// Wynik krótkiej diagnozy (sesja w formacie „diagnoza”): ile poprawnie, kropki odpowiedzi, zdanie Pestki i wynik
// każdej umiejętności. To samo na końcu diagnozy (/nauka/diagnoza) i w rozbiorze jej sesji (wejście z Powtórek, z mapy).
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Poziom } from "../../arkusze/typy";
import { Kielek } from "../../components/Kielek";
import { Kropki } from "../../components/wykresy";
import { adresMapy } from "../../nauka/adresy";
import type { OdpowiedzNauki, UmiejetnoscDiagnozy, WynikNauki } from "../../nauka/api";
import { OBSZARY } from "../../nauka/diagnoza";
import { NAZWA_STADIUM, stadium } from "../../nauka/stadia";
import { glos, wybierz } from "../../pestka/glos";
import { Opanowanie } from "./Opanowanie";
import { PestkaMowi } from "./PestkaRundy";
import s from "./NaukaPowtorki.module.css";

const kolejnoscObszaru = (area: string) => {
  const i = OBSZARY.findIndex((o) => o.id === area);
  return i < 0 ? OBSZARY.length : i;
};

/** Tytuł-wniosek: najmocniejsza i najsłabsza umiejętność według oceny po diagnozie. */
function wniosek(lista: UmiejetnoscDiagnozy[]) {
  const ocenione = lista.filter((u) => u.opanowanie != null).sort((a, b) => b.opanowanie! - a.opanowanie!);
  const [najlepsza] = ocenione;
  const najslabsza = ocenione.at(-1);
  if (!najlepsza || !najslabsza || najlepsza.opanowanie === najslabsza.opanowanie) return "Umiejętności";
  return `Najmocniej: ${najlepsza.name.toLowerCase()}. Na początek: ${najslabsza.name.toLowerCase()}.`;
}

export function WynikDiagnozy({ poziom, wynik, odpowiedzi, sesja }: {
  poziom: Poziom;
  wynik: WynikNauki;
  odpowiedzi: OdpowiedzNauki[];
  sesja: string;
}) {
  const umiejetnosci = [...(wynik.umiejetnosci ?? [])].sort((a, b) => kolejnoscObszaru(a.area) - kolejnoscObszaru(b.area));
  const dobre = odpowiedzi.filter((a) => a.correct).length;
  return (
    <>
      <section className={s.sekcja} aria-labelledby={`wynik-${sesja}`}>
        <h2 id={`wynik-${sesja}`} className="h1">{wynik.wynik.poprawne} z {wynik.wynik.wszystkich} poprawnie</h2>
        <Kropki
          opis={`Dobrze ${dobre} z ${odpowiedzi.length}.`}
          kropki={[...odpowiedzi].sort((a, b) => a.position - b.position).map((a) => ({ stan: a.correct ? "dobrze" : a.answer.trim() ? "zle" : "pominiete" }))}
        />
        <PestkaMowi tekst={wybierz(glos.diagnoza, wynik.wynik.wszystkich)} emocja={dobre === odpowiedzi.length && dobre > 0 ? "duma" : undefined} />
      </section>
      {umiejetnosci.length > 0 && (
        <section className={s.sekcja} aria-labelledby={`umiejetnosci-${sesja}`}>
          <h2 className="h2" id={`umiejetnosci-${sesja}`}>{wniosek(umiejetnosci)}</h2>
          <ul className={`wiersze ${s.kroki}`}>
            {umiejetnosci.map((u) => (
              <li key={u.skill_id}>
                <Link to={adresMapy(poziom, u.skill_id)} className="wiersz">
                  <span className="wiersz-ikona"><Kielek stadium={stadium(u.opanowanie)} rozmiar={32} /></span>
                  <span className="wiersz-tresc">
                    <span className="h3">{u.name}<span className="visually-hidden">, {NAZWA_STADIUM[stadium(u.opanowanie)]}</span></span>
                    <span className="wiersz-opis">{u.poprawne} z {u.wszystkich} dobrze</span>
                  </span>
                  {/* Po jednej, dwóch próbach ocena jest wstępna: pasek w kreskę jak przy niskiej pewności na mapie. */}
                  <span className="wiersz-wartosc"><Opanowanie score={u.opanowanie} confidence={u.score == null ? 0 : 1} /></span>
                  <span className="wiersz-akcja"><ChevronRight size={18} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
