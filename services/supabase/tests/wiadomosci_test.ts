import { assert, assertEquals } from "jsr:@std/assert";
import { dolaczObrazy, odczytajObraz, odczytajWiadomosci } from "../functions/ai/wiadomosci.ts";

// Najmniejsze prawidłowe nagłówki: PNG i JPEG (sprawdzamy podpis, nie cały obraz).
const png = `data:image/png;base64,${btoa("\x89PNG\r\n\x1a\n" + "x".repeat(12))}`;
const jpeg = `data:image/jpeg;base64,${btoa("\xff\xd8\xff\xe0" + "x".repeat(8))}`;

Deno.test("obraz: dopuszcza png, jpeg i webp z zgodnym podpisem", () => {
  assert(odczytajObraz(png));
  assert(odczytajObraz(jpeg));
  assert(odczytajObraz(`data:image/webp;base64,${btoa("RIFF....WEBP" + "x".repeat(6))}`));
});

Deno.test("obraz: odrzuca zły typ, podpis niezgodny z typem i adresy zdalne", () => {
  assertEquals(odczytajObraz(`data:image/gif;base64,${btoa("GIF89a" + "x".repeat(6))}`), null);
  assertEquals(odczytajObraz(`data:image/png;base64,${btoa("\xff\xd8\xff\xe0" + "x".repeat(8))}`), null);
  assertEquals(odczytajObraz("https://example.com/a.png"), null);
  assertEquals(odczytajObraz("data:image/png;base64,@@@@"), null);
  assertEquals(odczytajObraz(42), null);
});

Deno.test("obraz: odrzuca zbyt duży", () => {
  assertEquals(odczytajObraz(`data:image/png;base64,${"A".repeat(1_500_004)}`), null);
});

Deno.test("wiadomości: tekst zostaje tekstem, obrazy z ostatniej wiadomości ucznia idą osobno", () => {
  const w = odczytajWiadomosci([
    { role: "system", content: "s" },
    { role: "user", content: "pierwsze" },
    { role: "assistant", content: "odp" },
    { role: "user", content: [{ type: "text", text: "wyjaśnij" }, { type: "image_url", image_url: { url: png } }] },
  ]);
  assert(w);
  assertEquals(w.messages.map((m) => m.content), ["s", "pierwsze", "odp", "wyjaśnij"]);
  assertEquals(w.obrazy.length, 1);
  const wyslane = dolaczObrazy(w.messages, w.obrazy);
  assertEquals(wyslane[3].content, [{ type: "text", text: "wyjaśnij" }, w.obrazy[0]]);
  assertEquals(wyslane[1].content, "pierwsze");
});

Deno.test("wiadomości: odrzuca obrazy poza ostatnią wiadomością ucznia, u asystenta i ponad limit", () => {
  const czesci = [{ type: "image_url", image_url: { url: png } }];
  assertEquals(odczytajWiadomosci([{ role: "user", content: czesci }, { role: "user", content: "tekst" }]), null);
  assertEquals(odczytajWiadomosci([{ role: "assistant", content: czesci }]), null);
  assertEquals(odczytajWiadomosci([{ role: "user", content: [...czesci, ...czesci, ...czesci, ...czesci, ...czesci] }]), null);
  assertEquals(odczytajWiadomosci([{ role: "user", content: [{ type: "video", url: "x" }] }]), null);
  assertEquals(odczytajWiadomosci([{ role: "user", content: [{ type: "image_url", image_url: { url: "https://x/y.png" } }] }]), null);
});

Deno.test("wiadomości: zwykła rozmowa bez obrazów działa jak dotąd", () => {
  const w = odczytajWiadomosci([{ role: "user", content: "hej" }]);
  assertEquals(w?.obrazy, []);
  assertEquals(dolaczObrazy(w!.messages, []), w!.messages);
  assertEquals(odczytajWiadomosci([]), null);
  assertEquals(odczytajWiadomosci([{ role: "robot", content: "x" }]), null);
});
