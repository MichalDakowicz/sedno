// Wiadomości czatu z bramki AI: treść to tekst albo części (tekst i obrazy). Logika czatu (rozpoznawanie lektur,
// zapis priorytetu) czyta wyłącznie tekst, więc obrazy trzymamy osobno i dołączamy do ostatniej wiadomości ucznia
// dopiero przy wywołaniu modelu.
import type { ImagePart, Message } from "../_shared/llm.ts";

const ROLE = new Set(["system", "user", "assistant"]);
export const MAKS_OBRAZOW = 4;
// Pojedynczy obraz po base64; klient zmniejsza rysunki zadań do ~1600 px JPEG, zwykle 100–600 KB.
export const MAKS_BASE64 = 1_500_000;

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

export function odczytajObraz(url: unknown): ImagePart | null {
  const m = typeof url === "string" && url.length <= MAKS_BASE64 + 40 ? DATA_URL.exec(url) : null;
  if (!m || m[2]!.length % 4 !== 0 || m[2]!.length > MAKS_BASE64) return null;
  let bajty: string;
  try {
    bajty = atob(m[2]!.slice(0, 24));
  } catch {
    return null;
  }
  const pasuje = m[1] === "image/png" ? bajty.startsWith("\x89PNG\r\n\x1a\n") :
    m[1] === "image/jpeg" ? bajty.startsWith("\xff\xd8\xff") :
    bajty.startsWith("RIFF") && bajty.slice(8, 12) === "WEBP";
  return pasuje ? { type: "image_url", image_url: { url: url as string } } : null;
}

/** Wiadomości jako tekst plus obrazy ostatniej wiadomości ucznia; null, gdy coś nie spełnia schematu. */
export function odczytajWiadomosci(raw: unknown): { messages: Message[]; obrazy: ImagePart[] } | null {
  if (!Array.isArray(raw) || raw.length < 1) return null;
  const ostatniaUcznia = raw.findLastIndex((m) => m && typeof m === "object" && m.role === "user");
  const messages: Message[] = [];
  const obrazy: ImagePart[] = [];
  for (const [i, m] of raw.entries()) {
    if (!m || typeof m !== "object" || !ROLE.has(m.role)) return null;
    if (typeof m.content === "string") {
      messages.push({ role: m.role, content: m.content });
      continue;
    }
    // Części tylko w ostatniej wiadomości ucznia.
    if (!Array.isArray(m.content) || m.role !== "user" || i !== ostatniaUcznia) return null;
    const teksty: string[] = [];
    for (const czesc of m.content) {
      if (czesc?.type === "text" && typeof czesc.text === "string") teksty.push(czesc.text);
      else if (czesc?.type === "image_url") {
        const obraz = odczytajObraz(czesc.image_url?.url);
        if (!obraz || obrazy.length >= MAKS_OBRAZOW) return null;
        obrazy.push(obraz);
      } else return null;
    }
    messages.push({ role: "user", content: teksty.join("\n") });
  }
  return { messages, obrazy };
}

/** Obrazy wchodzą do ostatniej wiadomości ucznia; reszta rozmowy zostaje tekstem. */
export function dolaczObrazy(messages: Message[], obrazy: ImagePart[]): Message[] {
  if (!obrazy.length) return messages;
  const i = messages.findLastIndex((m) => m.role === "user");
  if (i < 0) return messages;
  const m = messages[i]!;
  if (m.role !== "user" || typeof m.content !== "string") return messages;
  return messages.map((x, j) => (j === i ? { role: "user", content: [{ type: "text", text: m.content as string }, ...obrazy] } : x));
}
