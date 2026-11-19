// Odpowiedź omow-brudnopis w trybie strumienia (services/supabase/nauka-ai.md, „Strumień dla tablicy”): zdarzenia
// `data: {json}` rozdzielone pustą linią, od `start` przez fragmenty wskazówki do `wynik` albo `blad`. Funkcja sprzed
// strumienia ignoruje pole `stream` i odpowiada jednym JSON-em, więc ten sam kod obsługuje oba przypadki.
import { AiError } from "../ai";

type Zdarzenie =
  | { type: "start" }
  | { type: "wskazowka"; delta?: unknown }
  | { type: "ksztalt" | "dopisek" }
  | { type: "wynik"; dane?: unknown }
  | { type: "blad"; error?: unknown; status?: unknown };

/**
 * Czyta odpowiedź funkcji i zwraca jej dane (to samo co bez strumienia). onWskazowka dostaje dotąd sklejony tekst
 * wskazówki po każdym fragmencie; ostateczna wskazówka jest w zwróconych danych (może być przycięta).
 */
export async function czytajOdpowiedzTablicy(res: Response, onWskazowka?: (tekst: string) => void): Promise<unknown> {
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
        onWskazowka?.(wskazowka);
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
