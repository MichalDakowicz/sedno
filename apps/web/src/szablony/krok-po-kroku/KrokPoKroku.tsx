import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Kreski, Strona, ZNumerem } from "../Szablon";
import { adres } from "../lista";
import s from "../Szablon.module.css";

const ETAPY = ["Plan", "Wstęp", "Rozwinięcie", "Zakończenie", "Przegląd"];

export function KrokPoKroku() {
  return (
    <Strona
      slug="krok-po-kroku"
      jakDziala={[
        "Etapy pracy. Uczeń przechodzi dalej, gdy obowiązkowe punkty etapu są spełnione; może wrócić do wcześniejszego.",
        "Polecenie z arkusza CKE albo wariant. Zawsze widoczne nad edytorem.",
        "Edytor bieżącego etapu z licznikiem słów względem zakresu z polecenia.",
        "Lista kontrolna z rubryki: AI ocenia elementy na żywo (słownie: brak, częściowo, jest), bez punktów.",
        "Pomoc wygasa: przy kolejnych pracach lista kontrolna jest coraz krótsza, a na końcu znika.",
        "Przegląd i oddanie: pełna ocena z rubryki, potem ekran rozbioru.",
      ]}
    >
      <section className={s.sekcja}>
        <ZNumerem n={1}>
          <span className="label">Etap 2 z 5</span>
        </ZNumerem>
        <div className={s.chipy}>
          {ETAPY.map((e, i) => (
            <span key={e} className={`${s.chip} ${i === 1 ? s.chipAktywny : ""}`}>
              {i < 1 && <Check size={14} aria-hidden="true" />}
              {e}
            </span>
          ))}
        </div>
      </section>

      <div className={s.boczna}>
        <section style={{ display: "grid", gap: 16 }}>
          <ZNumerem n={2}>
            <span className="label">Polecenie</span>
          </ZNumerem>
          <p className="muted">
            Napisz rozprawkę (200–250 słów): czy media społecznościowe pomagają młodym ludziom w nauce języków? Uwzględnij dwa argumenty i
            kontrargument.
          </p>
          <ZNumerem n={3}>
            <span className="label">Wstęp</span>
          </ZNumerem>
          <div className={s.poleWielo}>
            <Kreski szer={[96, 88, 72]} />
          </div>
          <span className="muted small">42 słowa · całość 42 z 200–250</span>
        </section>

        <aside className={s.kolumna}>
          <ZNumerem n={4}>
            <span className="label">Lista kontrolna</span>
          </ZNumerem>
          <ul className={s.wiersze} style={{ width: "100%" }}>
            <li className={s.wiersz}>
              <span>Wprowadzenie w temat</span>
              <span className={`small ${s.ok}`}>jest</span>
            </li>
            <li className={s.wiersz}>
              <span>Teza</span>
              <span className="small" style={{ color: "var(--primary-text)" }}>
                częściowo
              </span>
            </li>
            <li className={s.wiersz}>
              <span>Zapowiedź argumentów</span>
              <span className="muted small">brak</span>
            </li>
          </ul>
          <ZNumerem n={5}>
            <span className="muted small">Pomoc: pełna (1. praca tego typu)</span>
          </ZNumerem>
        </aside>
      </div>

      <div className={s.akcje}>
        <span className="btn btn-ghost">Wstecz</span>
        <span className="btn btn-secondary">Dalej: Rozwinięcie</span>
        <ZNumerem n={6}>
          <Link to={adres("rozbior")} className="btn btn-primary">
            Oddaj pracę
          </Link>
        </ZNumerem>
      </div>
    </Strona>
  );
}
