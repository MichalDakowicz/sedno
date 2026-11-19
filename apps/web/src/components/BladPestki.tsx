// Błąd wywołania Pestki (nauka/ai.ts) w jednym kształcie na każdym ekranie: co się stało, ponowienie, gdy ma sens,
// i link do profilu, gdy bez zmiany konfiguracji nic się nie zmieni. BrakPestki: konto bez podpiętego modelu.
import { Link } from "react-router-dom";
import { komunikatPestki } from "../nauka/ai";
import { StanPestki } from "./StanPestki";
import s from "./BladPestki.module.css";

export function BladPestki({ blad, ponow, etykieta = "Spróbuj ponownie" }: { blad: unknown; ponow?: () => void; etykieta?: string }) {
  const k = komunikatPestki(blad);
  return (
    <StanPestki emocja="zmartwienie" rozmiar="maly" rola="alert" tekst={k.tekst}
      akcja={k.ponow && ponow ? { etykieta, onClick: ponow } : undefined}>
      {k.konfiguracja && <Link to="/profil#ai" className="link small">Ustaw model w profilu</Link>}
    </StanPestki>
  );
}

export function BrakPestki({ tekst }: { tekst: string }) {
  return (
    <div className={s.brak}>
      <p>{tekst}</p>
      <Link to="/profil#ai" className="btn btn-secondary">Połącz Pestkę w profilu</Link>
    </div>
  );
}
