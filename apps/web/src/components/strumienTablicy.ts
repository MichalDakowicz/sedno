// Odpowiedź omow-brudnopis w trybie strumienia (services/supabase/nauka-ai.md, „Strumień dla tablicy”): zdarzenia
// `data: {json}` rozdzielone pustą linią, od `start` przez fragmenty wskazówki do `wynik` albo `blad`. Funkcja sprzed
// strumienia ignoruje pole `stream` i odpowiada jednym JSON-em, więc ten sam kod obsługuje oba przypadki.
import { AiError } from "../ai";
import type { DopisekPestki, Ksztalt } from "./brudnopisPestkaApi";

type Zdarzenie =
  | { type: "start" }
  | { type: "wskazowka"; delta?: unknown }
  | { type: "ksztalt"; ksztalt?: unknown }
  | { type: "dopisek"; dopisek?: unknown }
  | { type: "wynik"; dane?: unknown }
  | { type: "blad"; error?: unknown; status?: unknown };

/** Co strona robi z kawałkami odpowiedzi, zanim przyjdzie wynik. */
export type ZdarzeniaTablicy = {
  /** Dotąd sklejony tekst wskazówki po każdym fragmencie; ostateczna (może być przycięta) jest w wyniku. */
  wskazowka?: (tekst: string) => void;
  /** Figura gotowa do narysowania (serwer już ją sprawdził; tu tylko kształt danych). */
  ksztalt?: (ksztalt: Ksztalt) => void;
  dopisek?: (dopisek: DopisekPestki) => void;
};

const punkt = (p: unknown) => Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === "number" && Number.isFinite(v));

function jakoKsztalt(k: unknown): Ksztalt | null {
  if (!k || typeof k !== "object") return null;
  const { typ, punkty } = k as { typ?: unknown; punkty?: unknown };
  if (!Array.isArray(punkty) || !punkty.every(punkt)) return null;
  if (typ === "trojkat") return punkty.length === 3 ? (k as Ksztalt) : null;
  return ["odcinek", "strzalka", "prostokat", "elipsa"].includes(typ as string) && punkty.length === 2 ? (k as Ksztalt) : null;
}

function jakoDopisek(d: unknown): DopisekPestki | null {
  if (!d || typeof d !== "object") return null;
  const { typ, tekst } = d as { typ?: unknown; tekst?: unknown };
  return ["obliczenia", "tekst", "kod"].includes(typ as string) && typeof tekst === "string" && tekst.trim() ? (d as DopisekPestki) : null;
}

/** Czyta odpowiedź funkcji i zwraca jej dane (to samo co bez strumienia); kawałki po drodze idą do `naZywo`. */
export async function czytajOdpowiedzTablicy(res: Response, naZywo: ZdarzeniaTablicy = {}): Promise<unknown> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new AiError(typeof body?.error === "string" ? body.error : "server_error", res.status);
  }
  if (!res.body || !(res.headers.get("Content-Type") ?? "").includes("text/event-stream")) {
    return res.json().catch(() => null);
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let bufor = "";
  let wskazowka = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (value) bufor += value.replace(/\r\n/g, "\n");
    let koniec: number;
    while ((koniec = bufor.indexOf("\n\n")) >= 0 || (done && bufor.trim())) {
      const blok = koniec >= 0 ? bufor.slice(0, koniec) : bufor;
      bufor = koniec >= 0 ? bufor.slice(koniec + 2) : "";
      const dane = blok.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
      if (!dane) continue;
      let ev: Zdarzenie;
      try {
        ev = JSON.parse(dane) as Zdarzenie;
      } catch {
        continue;
      }
      if (ev.type === "wskazowka" && typeof ev.delta === "string") {
        wskazowka += ev.delta;
        naZywo.wskazowka?.(wskazowka);
      } else if (ev.type === "ksztalt") {
        const k = jakoKsztalt(ev.ksztalt);
        if (k) naZywo.ksztalt?.(k);
      } else if (ev.type === "dopisek") {
        const d = jakoDopisek(ev.dopisek);
        if (d) naZywo.dopisek?.(d);
      } else if (ev.type === "wynik") {
        void reader.cancel().catch(() => {});
        return ev.dane;
      } else if (ev.type === "blad") {
        void reader.cancel().catch(() => {});
        throw new AiError(typeof ev.error === "string" ? ev.error : "provider_failed", typeof ev.status === "number" ? ev.status : 424);
      }
    }
    if (done) break;
  }
  // Strumień urwał się przed wynikiem.
  throw new AiError("server_error", 502);
}
