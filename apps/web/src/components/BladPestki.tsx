// Błąd wywołania Pestki (nauka/ai.ts) w jednym kształcie na każdym ekranie: co się stało, ponowienie, gdy ma sens,
// BrakPestki: serwer nie ma teraz dostawcy modelu.
import { komunikatPestki } from "../nauka/ai";
import { StanPestki } from "./StanPestki";
import s from "./BladPestki.module.css";

export function BladPestki({ blad, ponow, etykieta = "Spróbuj ponownie" }: { blad: unknown; ponow?: () => void; etykieta?: string }) {
  const k = komunikatPestki(blad);
  return (
    <StanPestki emocja="zmartwienie" rozmiar="maly" rola="alert" tekst={k.tekst}
      akcja={k.ponow && ponow ? { etykieta, onClick: ponow } : undefined}>
    </StanPestki>
  );
}

export function BrakPestki({ tekst }: { tekst: string }) {
  return (
    <div className={s.brak}>
      <p>{tekst}</p>
    </div>
  );
}
