// Zdjęcie rozwiązania z kartki: uczeń robi zdjęcie albo wybiera plik, Pestka odczytuje pismo (odczytaj-zdjecie),
// uczeń poprawia odczyt, a Pestka wskazuje krok do sprawdzenia i zadaje jedno pytanie (omow-odczyt). Zdjęcie nie jest
// nigdzie zapisywane: idzie tylko w żądaniu odczytu. Obraz zmniejszamy w przeglądarce pod limit 1 MiB funkcji.
import { useEffect, useId, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Camera, ImageUp, MessageCircle, RotateCcw } from "lucide-react";
import { useArkusz } from "../../arkusze/dane";
import { nazwaZadaniaCke, type Zadanie } from "../../arkusze/typy";
import { BladPestki, BrakPestki } from "../../components/BladPestki";
import { Ladowanie } from "../../components/Ladowanie";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { useKontekstPestki, useTutor } from "../../components/TutorContext";
import { czyPrzerwane, naukaAi, type ObrazDoWyslania, type OdczytZdjecia, type OmowienieOdczytu } from "../../nauka/ai";
import { PestkaMowi } from "./PestkaRundy";
import s from "./SzybkaRunda.module.css";
import z from "./Zdjecie.module.css";

// Limit funkcji to 1 MiB po zdekodowaniu; zostawiamy zapas.
const MAX_BAJTOW = 900 * 1024;

export const adresZdjecia = (arkusz?: string, zadanie?: number | string) =>
  arkusz && zadanie !== undefined ? `/nauka/zdjecie?arkusz=${encodeURIComponent(arkusz)}&zadanie=${zadanie}` : "/nauka/zdjecie";

/** Treść zadania z arkusza jako zwykły tekst, tak jak dostaje ją Pestka przy brudnopisie. */
export function polecenieZadania(z: Zadanie): string {
  return [
    `Zadanie ${z.nr}.`,
    ...z.polecenie,
    ...z.bloki.flatMap((b) => {
      if (b.typ === "akapit" || b.typ === "naglowek" || b.typ === "kadr") return [b.tekst];
      if (b.typ === "wzor") return [b.tex];
      if (b.typ === "tabelaTresci") return b.wiersze.map((w) => w.join(" | "));
      return [];
    }),
    ...z.pytania.map((p) => p.tresc),
  ].filter(Boolean).join("\n").slice(0, 3500);
}

async function doBlob(canvas: HTMLCanvasElement, jakosc: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", jakosc));
}

/** Zdjęcie z telefonu (często 3–8 MB) jako JPEG do ok. 900 KB: najpierw dłuższy bok 1600 px, potem niższa jakość i mniejszy rozmiar. */
async function zmniejsz(plik: File): Promise<{ blob: Blob; obraz: ObrazDoWyslania }> {
  const bitmapa = await createImageBitmap(plik, { imageOrientation: "from-image" });
  let bok = Math.min(1600, Math.max(bitmapa.width, bitmapa.height));
  for (let proba = 0; proba < 6; proba++) {
    const skala = bok / Math.max(bitmapa.width, bitmapa.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmapa.width * skala);
    canvas.height = Math.round(bitmapa.height * skala);
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    // Przezroczyste PNG na białym tle, jak kartka.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmapa, 0, 0, canvas.width, canvas.height);
    for (const jakosc of [0.85, 0.72, 0.6]) {
      const blob = await doBlob(canvas, jakosc);
      if (blob && blob.size <= MAX_BAJTOW) {
        bitmapa.close();
        return { blob, obraz: { mime: "image/jpeg", base64: await base64(blob) } };
      }
    }
    bok = Math.round(bok * 0.75);
  }
  bitmapa.close();
  throw new Error("za-duze");
}

function base64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result.split(",", 2)[1] ?? "") : reject(new Error("odczyt")));
    reader.onerror = () => reject(new Error("odczyt"));
    reader.readAsDataURL(blob);
  });
}

type Krok = "zdjecie" | "odczyt" | "omowienie";

export function Zdjecie() {
  const [params] = useSearchParams();
  const arkuszId = params.get("arkusz");
  const nr = Number(params.get("zadanie"));
  const zArkusza = !!arkuszId && Number.isInteger(nr) && nr > 0;
  const { aiGotowe } = useTutor();

  return (
    <main className={`container czytanie ${s.strona}`}>
      <NaglowekStrony
        wstecz={zArkusza ? { do: `/arkusze/${arkuszId}#zadanie-${nr}`, nazwa: "Arkusz" } : { do: "/nauka", nazwa: "Nauka" }}
        tytul="Zdjęcie z kartki"
        lead="Pestka czyta rozwiązanie i wskazuje krok do sprawdzenia."
      />
      {aiGotowe === false ? (
        <BrakPestki tekst="Zdjęcie czyta Pestka, a na tym koncie nie ma jeszcze modelu." />
      ) : zArkusza ? (
        <ZadanieZArkusza arkuszId={arkuszId!} nr={nr} />
      ) : (
        <Przebieg key="wlasne" tytul={null} polecenieStartowe="" />
      )}
    </main>
  );
}

function ZadanieZArkusza({ arkuszId, nr }: { arkuszId: string; nr: number }) {
  const arkusz = useArkusz(arkuszId);
  const zadanie = arkusz.dane?.zadania.find((x) => x.nr === nr);
  if (arkusz.laduje) return <Ladowanie ksztalt="tekst" etykieta="Wczytuję zadanie" />;
  if (!zadanie) {
    return (
      <div className={s.komunikat}>
        <p role="alert">Nie udało się wczytać tego zadania.</p>
        <Link to="/nauka/zdjecie" className="btn btn-secondary">Wpisz treść zadania</Link>
      </div>
    );
  }
  return <Przebieg key={`${arkuszId}-${nr}`} tytul={nazwaZadaniaCke(arkuszId, String(nr))} polecenieStartowe={polecenieZadania(zadanie)} />;
}

function Przebieg({ tytul, polecenieStartowe }: { tytul: string | null; polecenieStartowe: string }) {
  const { open } = useTutor();
  const [polecenie, ustawPolecenie] = useState(polecenieStartowe);
  const [krok, ustawKrok] = useState<Krok>("zdjecie");
  const [zdjecie, ustawZdjecie] = useState<{ url: string; obraz: ObrazDoWyslania; kb: number } | null>(null);
  const [przygotowuje, ustawPrzygotowuje] = useState(false);
  const [odczyt, ustawOdczyt] = useState<OdczytZdjecia | null>(null);
  const [tekst, ustawTekst] = useState("");
  const [omowienie, ustawOmowienie] = useState<OmowienieOdczytu | null>(null);
  const [czeka, ustawCzeka] = useState(false);
  const [blad, ustawBlad] = useState<{ blad: unknown; ponow: () => void } | null>(null);
  const [bladPliku, ustawBladPliku] = useState("");
  const trwa = useRef<AbortController | null>(null);
  const aparat = useRef<HTMLInputElement>(null);
  const plik = useRef<HTMLInputElement>(null);
  const naglowekOdczytu = useRef<HTMLHeadingElement>(null);
  const naglowekOmowienia = useRef<HTMLHeadingElement>(null);
  const idPolecenia = useId();

  useEffect(() => () => { trwa.current?.abort(); }, []);
  useEffect(() => () => { if (zdjecie) URL.revokeObjectURL(zdjecie.url); }, [zdjecie]);
  useEffect(() => {
    if (krok === "odczyt") naglowekOdczytu.current?.focus();
    if (krok === "omowienie") naglowekOmowienia.current?.focus();
  }, [krok]);

  const kontekst = {
    klucz: `zdjecie:${tytul ?? "wlasne"}`,
    tytul: tytul ? `${tytul}, zdjęcie z kartki` : "zdjęcie rozwiązania z kartki",
    opis: [`Treść zadania:\n${polecenie}`, tekst && `Odczyt rozwiązania ucznia (sprawdzony przez ucznia):\n${tekst}`,
      omowienie && `Twoja uwaga: ${omowienie.uwaga}\nTwoje pytanie: ${omowienie.pytanie}`,
      "Nie podawaj gotowego rozwiązania: naprowadzaj pytaniami."].filter(Boolean).join("\n\n"),
  };
  useKontekstPestki(polecenie.trim() ? kontekst : null);

  async function wybrano(lista: FileList | null) {
    const f = lista?.[0];
    if (!f) return;
    ustawBladPliku("");
    ustawPrzygotowuje(true);
    try {
      const { blob, obraz } = await zmniejsz(f);
      ustawZdjecie({ url: URL.createObjectURL(blob), obraz, kb: Math.round(blob.size / 1024) });
      ustawOdczyt(null);
      ustawOmowienie(null);
      ustawKrok("zdjecie");
    } catch {
      ustawBladPliku("Tego pliku nie da się otworzyć jako zdjęcia. Wybierz JPG, PNG albo WebP.");
    } finally {
      ustawPrzygotowuje(false);
      if (aparat.current) aparat.current.value = "";
      if (plik.current) plik.current.value = "";
    }
  }

  async function wywolaj<T>(zadanie: (signal: AbortSignal) => Promise<T>, gotowe: (w: T) => void, ponow: () => void) {
    if (trwa.current) return;
    const ctrl = new AbortController();
    trwa.current = ctrl;
    ustawCzeka(true);
    ustawBlad(null);
    try {
      const wynik = await zadanie(ctrl.signal);
      if (!ctrl.signal.aborted) gotowe(wynik);
    } catch (e) {
      if (!ctrl.signal.aborted && !czyPrzerwane(e)) ustawBlad({ blad: e, ponow });
    } finally {
      if (trwa.current === ctrl) trwa.current = null;
      if (!ctrl.signal.aborted) ustawCzeka(false);
    }
  }

  const odczytaj = () => zdjecie && void wywolaj(
    (signal) => naukaAi.odczytajZdjecie(zdjecie.obraz, signal),
    (w) => { ustawOdczyt(w); ustawTekst(w.tekst); ustawKrok("odczyt"); },
    odczytaj,
  );
  const omow = () => void wywolaj(
    (signal) => naukaAi.omowOdczyt(polecenie.trim(), tekst.trim(), signal),
    (w) => { ustawOmowienie(w); ustawKrok("omowienie"); },
    omow,
  );

  function odNowa() {
    trwa.current?.abort();
    ustawZdjecie(null);
    ustawOdczyt(null);
    ustawOmowienie(null);
    ustawTekst("");
    ustawBlad(null);
    ustawKrok("zdjecie");
  }

  return (
    <>
      <section className={`${s.sekcja} ${z.bezLinii}`} aria-labelledby={idPolecenia}>
        <h2 className="h2" id={idPolecenia}>{tytul ?? "Zadanie"}</h2>
        {tytul ? (
          <p className={z.polecenie}>{polecenie}</p>
        ) : (
          <label className={z.pole}>
            <span className="small">Treść zadania</span>
            <textarea className={z.tekst} rows={4} maxLength={3500} value={polecenie} disabled={krok !== "zdjecie"}
              placeholder="Przepisz albo wklej polecenie" onChange={(e) => ustawPolecenie(e.currentTarget.value)} />
          </label>
        )}
      </section>

      <section className={s.sekcja} aria-labelledby="zdjecie-rozwiazania">
        <h2 className="h2" id="zdjecie-rozwiazania">Rozwiązanie</h2>
        <input ref={aparat} type="file" accept="image/*" capture="environment" className="visually-hidden" tabIndex={-1}
          aria-hidden="true" onChange={(e) => void wybrano(e.currentTarget.files)} />
        <input ref={plik} type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" tabIndex={-1}
          aria-hidden="true" onChange={(e) => void wybrano(e.currentTarget.files)} />
        {zdjecie && <img src={zdjecie.url} alt="Twoje zdjęcie rozwiązania" className={z.podglad} />}
        <div className={s.akcje}>
          <button type="button" className={zdjecie ? "btn btn-ghost" : "btn btn-secondary"} disabled={czeka || przygotowuje} onClick={() => aparat.current?.click()}>
            <Camera size={17} aria-hidden="true" /> {zdjecie ? "Inne zdjęcie" : "Zrób zdjęcie"}
          </button>
          <button type="button" className="btn btn-ghost" disabled={czeka || przygotowuje} onClick={() => plik.current?.click()}>
            <ImageUp size={17} aria-hidden="true" /> Wybierz plik
          </button>
          {przygotowuje && <span role="status" className="small muted">Przygotowuję zdjęcie…</span>}
        </div>
        {bladPliku && <p role="alert" className={s.blad}>{bladPliku}</p>}
        {zdjecie && krok === "zdjecie" && (
          <div className={s.akcje}>
            <button type="button" className="btn btn-primary" disabled={czeka || !polecenie.trim()} onClick={odczytaj}>
              {czeka ? "Pestka czyta…" : "Odczytaj"}
            </button>
            {!polecenie.trim() && <span className="small muted">Najpierw wpisz treść zadania.</span>}
          </div>
        )}
        {krok === "zdjecie" && blad && <BladPestki blad={blad.blad} ponow={blad.ponow} />}
      </section>

      {odczyt && (
        <section className={s.sekcja} aria-labelledby="odczyt-zdjecia">
          <h2 className="h2" id="odczyt-zdjecia" tabIndex={-1} ref={naglowekOdczytu}>Odczyt</h2>
          {odczyt.watpliwosci.length > 0 && (
            <ul className={z.watpliwosci} aria-label="Fragmenty do sprawdzenia">
              {odczyt.watpliwosci.map((w, i) => <li key={i} className="small">{w}</li>)}
            </ul>
          )}
          <label className={z.pole}>
            <span className="small">Popraw, jeśli Pestka coś przeczytała źle</span>
            <textarea className={z.tekst} rows={8} maxLength={8500} value={tekst} disabled={krok === "omowienie"}
              onChange={(e) => ustawTekst(e.currentTarget.value)} />
          </label>
          {krok === "odczyt" && (
            <div className={s.akcje}>
              <button type="button" className="btn btn-primary" disabled={czeka || !tekst.trim()} onClick={omow}>
                {czeka ? "Pestka sprawdza…" : "Omów z Pestką"}
              </button>
            </div>
          )}
          {krok === "odczyt" && blad && <BladPestki blad={blad.blad} ponow={blad.ponow} />}
        </section>
      )}

      {omowienie && (
        <section className={s.sekcja} aria-labelledby="omowienie-zdjecia">
          <h2 className="h2" id="omowienie-zdjecia" tabIndex={-1} ref={naglowekOmowienia}>Do sprawdzenia</h2>
          <div aria-live="polite">
            <PestkaMowi tekst={omowienie.uwaga}>
              <p className={z.pytanie}>{omowienie.pytanie}</p>
            </PestkaMowi>
          </div>
          <div className={s.akcje}>
            <button type="button" className="btn btn-primary" onClick={() => open(kontekst)}>
              <MessageCircle size={17} aria-hidden="true" /> Odpowiedz Pestce
            </button>
            <button type="button" className="btn btn-ghost" onClick={odNowa}>
              <RotateCcw size={17} aria-hidden="true" /> Nowe zdjęcie
            </button>
          </div>
        </section>
      )}
    </>
  );
}
