import assert from "node:assert/strict";
import { mocnaTrasa } from "../functions/_shared/ai-default.ts";

const serwer = { provider: "sedno", model: "claude-sonnet-5-5", p: { baseUrl: "https://api.anthropic.com/v1", key: "k", model: "claude-sonnet-5-5" } };
const bezEnv = () => undefined;

Deno.test("wypracowania z polskiego i sprawdzanie lektur idą na Opusa", () => {
  for (const task of ["omowienie-wypracowania-polski", "pestka-sprawdz-lekture"]) {
    const r = mocnaTrasa(serwer, task, bezEnv);
    assert.equal(r.model, "claude-opus-5-5");
    assert.equal(r.p.model, "claude-opus-5-5");
  }
});

Deno.test("reszta zadań zostaje na swoim modelu", () => {
  for (const task of ["nauka-omow-brudnopis", "nauka-prowadz-brudnopis", "pestka-czat", "omowienie-wypracowania", "omowienie-bledu", null]) assert.equal(mocnaTrasa(serwer, task, bezEnv), serwer);
});

Deno.test("własny klucz konta i inny dostawca bez Opusa", () => {
  const wlasny = { ...serwer, provider: "openai" };
  assert.equal(mocnaTrasa(wlasny, "omowienie-wypracowania-polski", bezEnv), wlasny);
  const inny = { ...serwer, p: { ...serwer.p, baseUrl: "https://api.openai.com/v1" } };
  assert.equal(mocnaTrasa(inny, "omowienie-wypracowania-polski", bezEnv), inny);
});

Deno.test("SEDNO_AI_MODEL_MOCNE nadpisuje domyślny model", () => {
  const env = (n: string) => (n === "SEDNO_AI_MODEL_MOCNE" ? "claude-fable-5-2" : undefined);
  assert.equal(mocnaTrasa(serwer, "omowienie-wypracowania-polski", env).model, "claude-fable-5-2");
});
