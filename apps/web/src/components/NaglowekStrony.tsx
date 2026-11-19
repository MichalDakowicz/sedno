// Nagłówek strony, ten sam na każdej ścieżce: link powrotu albo etykieta kontekstu, tytuł, opcjonalny lead
// i linia pod spodem. Strony nie składają własnych nagłówków, żeby odstępy i krój zgadzały się wszędzie.
import type { ReactNode, Ref } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import s from "./NaglowekStrony.module.css";

export function NaglowekStrony({ wstecz, etykieta, tytul, lead, tytulRef, children }: {
  /** Link powrotu (runda, rozbiór, „Uczeń uczy”); wyklucza etykietę. */
  wstecz?: { do: string; nazwa: string };
  /** Kontekst strony nad tytułem, np. „Język angielski” albo „Profil”. */
  etykieta?: ReactNode;
  tytul: ReactNode;
  lead?: ReactNode;
  /** Fokus programowy na tytule (po wejściu z parametrem albo po zakończeniu rundy). */
  tytulRef?: Ref<HTMLHeadingElement>;
  /** Drobny opis pod leadem, np. poziom i umiejętność rundy. */
  children?: ReactNode;
}) {
  return (
    <header className={s.naglowek}>
      {wstecz ? (
        <Link to={wstecz.do} className={`link small ${s.wstecz}`}><ArrowLeft size={15} aria-hidden="true" /> {wstecz.nazwa}</Link>
      ) : etykieta ? <span className={s.etykieta}>{etykieta}</span> : null}
      <h1 className="display" tabIndex={tytulRef ? -1 : undefined} ref={tytulRef}>{tytul}</h1>
      {lead && <p className={s.lead}>{lead}</p>}
      {children}
    </header>
  );
}
