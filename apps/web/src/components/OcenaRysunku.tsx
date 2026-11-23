// Sprawdzenie rysunku z figury przez Pestkę, po sprawdzeniu arkusza. Obraz (figura z rysunkiem ucznia) i opis
// słowami idą do nauka-ai („ocen-rozwiazanie”, źródło: arkusz + numer pytania); polecenie, zasady i rozwiązanie CKE
// serwer bierze z bazy. Wynik to podpowiedź: o punktach i tak decyduje uczeń przyciskami samooceny.
import { Check } from "lucide-react";
import { useRef, useState } from "react";
import { rysunekDoPng, type Kreska } from "../arkusze/rysunek";
import { adresObrazu, type Obraz } from "../arkusze/typy";
import { czyPrzerwane, komunikatPestki, naukaAi, type OcenaRozwiazania } from "../nauka/ai";

export function OcenaRysunku({
  arkusz,
  pytanie,
  obraz,
  kreski,
  opis,
  maks,
  onPrzyjmij,
}: {
  arkusz: string;
  pytanie: string;
  obraz: Obraz;
  kreski: Kreska[];
  opis: string;
  maks: number;
  onPrzyjmij: (punkty: number) => void;
}) {
  const [stan, setStan] = useState<"idle" | "trwa" | "blad">("idle");
  const [wynik, setWynik] = useState<OcenaRozwiazania | null>(null);
  const [blad, setBlad] = useState("");
  const przerwij = useRef<AbortController | null>(null);

  const ocen = async () => {
    przerwij.current?.abort();
    const ac = (przerwij.current = new AbortController());
    setStan("trwa");
    try {
      const png = kreski.length ? await rysunekDoPng(obraz, kreski, adresObrazu(obraz.src)) : null;
      const w = await naukaAi.ocenPytanieArkusza(
        crypto.randomUUID(),
        arkusz,
        pytanie,
        { ...(opis.trim() ? { tekst: opis.trim() } : {}), ...(png ? { obraz: { mime: png.mime, base64: png.base64 } } : {}) },
        ac.signal,
      );
      setWynik(w);
      setStan("idle");
    } catch (e) {
      if (czyPrzerwane(e)) return;
      setBlad(komunikatPestki(e).tekst);
      setStan("blad");
    }
  };

  const przyznane = wynik?.status === "ocenione" && wynik.punkty !== null ? Math.min(maks, wynik.punkty) : null;
  return (
    <div>
      <button type="button" className="btn btn-sm btn-secondary" onClick={ocen} disabled={stan === "trwa" || (!kreski.length && !opis.trim())}>
        {stan === "trwa" ? "Pestka ogląda rysunek…" : wynik ? "Oceń jeszcze raz z Pestką" : "Oceń z Pestką"}
      </button>
      {stan === "blad" && (
        <p className="small" role="alert">
          {blad}
        </p>
      )}
      {wynik && (
        <p className="small" role="status">
          {przyznane !== null && (
            <strong>
              Pestka: {przyznane} z {maks} pkt.{" "}
            </strong>
          )}
          {wynik.opis}
          {wynik.krok ? ` ${wynik.krok}` : ""}
          {przyznane !== null && (
            <>
              {" "}
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => onPrzyjmij(przyznane)}>
                <Check size={15} aria-hidden="true" /> Przyjmuję
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}
