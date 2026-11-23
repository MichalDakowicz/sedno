import assert from "node:assert/strict";

// konto.ts tworzy klienta admina przy imporcie, a ten zapamiętuje fetch: podstawiamy oba przed importem.
Deno.env.set("SUPABASE_URL", "http://supabase.test");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test");
let pytanieZBazy: unknown = null;
const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes("/rpc/nauka_pytanie_do_oceny")) return Promise.resolve(Response.json(pytanieZBazy));
  return realFetch(input, init);
};
const { ocenRozwiazanie, sprawdzArkusz } = await import("../functions/nauka-ai/ocenianie.ts");
const { BladApi } = await import("../functions/nauka-ai/protokol.ts");

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==";
const obraz = { type: "image_url", image_url: { url: `data:image/png;base64,${PNG}` } } as const;
const praca = { tekst: null, kod: null, jezyk: null, wynik: null, pola: null, obraz };
const cel = { arkusz: "biologia-2025", pytanie: "9.1" };

function baza(przedmiot: string, pytanie: Record<string, unknown>) {
  pytanieZBazy = {
    przedmiot, zadanie: "9", polecenie: ["Uzupełnij rysunek."], kontekst: [], pdf: null,
    pytanie: { nr: "9.1", typ: "otwarte", punkty: 2, tresc: "Narysuj oś symetrii.", ...pytanie },
  };
}

type Wywolanie = { instrukcja: string; dane: Record<string, unknown>; obraz?: unknown };
function atrapa(odpowiedz: Record<string, unknown>, wywolania: Wywolanie[]) {
  return (_task: string, _tier: string, instrukcja: string, dane: Record<string, unknown>, _limit?: number, obraz?: unknown) => {
    wywolania.push({ instrukcja, dane, obraz });
    return Promise.resolve(odpowiedz);
  };
}

const RYSUNEK = { obraz: { src: "x.png", szer: 10, wys: 10 }, polecenie: "Zaznacz oś symetrii figury." };

Deno.test("Pytanie z rysowaniem z biologii trafia do modelu razem z obrazem i poleceniem rysunku", async () => {
  baza("biologia", { rysowanie: RYSUNEK, zasady: "1 p. za poprawnie zaznaczoną oś symetrii.", rozwiazanie: "Oś pionowa." });
  const wywolania: Wywolanie[] = [];
  const ocena = await sprawdzArkusz(cel, praca, atrapa({
    status: "ocenione", punkty: 1, opis: "Oś zaznaczona, brakuje podpisu.", kryterium: "poprawnie zaznaczoną oś symetrii", krok: "Podpisz oś.",
  }, wywolania) as never);
  assert.equal(ocena.status, "ocenione");
  assert.equal(ocena.punkty, 1);
  assert.equal(wywolania.length, 1);
  assert.equal(wywolania[0].obraz, obraz);
  assert.deepEqual(wywolania[0].dane.rysunek, { polecenie: RYSUNEK.polecenie });
  assert.match(wywolania[0].instrukcja, /rysunek ucznia/);
  assert.match(wywolania[0].instrukcja, /punkty 0/);
});

Deno.test("Schemat i rozwiązanie pochodzą z bazy, a nie od klienta", async () => {
  baza("biologia", { rysowanie: RYSUNEK, zasady: "1 p. za oś z bazy.", rozwiazanie: "Rozwiązanie z bazy." });
  const wywolania: Wywolanie[] = [];
  const podstawiona = { ...praca, zasady: "2 p. za cokolwiek", rozwiazanie: "narysuj byle co", maksPunktow: 99 };
  await sprawdzArkusz(cel, podstawiona, atrapa({
    status: "ocenione", punkty: 0, opis: "Nie widać rysunku.", kryterium: "1 p. za oś z bazy.",
  }, wywolania) as never);
  const dane = wywolania[0].dane;
  assert.equal(dane.kryteriaCke, "1 p. za oś z bazy.");
  assert.equal(dane.przykladZKlucza, "Rozwiązanie z bazy.");
  assert.equal(dane.maksPunktow, 2);
  assert.ok(!JSON.stringify(dane).includes("byle co"));
});

Deno.test("Punkty ponad maksimum z bazy są odrzucane", async () => {
  baza("biologia", { rysowanie: RYSUNEK, zasady: "1 p. za oś." });
  const ocena = await sprawdzArkusz(cel, praca, atrapa({ status: "ocenione", punkty: 5, opis: "Za dużo.", kryterium: "1 p. za oś." }, []) as never);
  assert.equal(ocena.status, "do-weryfikacji");
  assert.equal(ocena.punkty, null);
});

Deno.test("Pytanie bez rysowania w przedmiocie spoza listy nadal jest odrzucane", async () => {
  baza("biologia", { zasady: "1 p." });
  const wywolania: Wywolanie[] = [];
  await assert.rejects(sprawdzArkusz(cel, praca, atrapa({}, wywolania) as never), (e) => e instanceof BladApi && e.kod === "unsupported_question");
  assert.equal(wywolania.length, 0);
});

Deno.test("Matematyka bez rysowania działa jak dotąd", async () => {
  baza("matematyka", { zasady: "1 p. za wynik.", punkty: 1 });
  const wywolania: Wywolanie[] = [];
  const ocena = await sprawdzArkusz(cel, { ...praca, tekst: "wynik 5", obraz: null }, atrapa({
    status: "ocenione", punkty: 1, opis: "Dobrze.", fragment: "wynik 5", kryterium: "1 p. za wynik.",
  }, wywolania) as never);
  assert.equal(ocena.punkty, 1);
  assert.equal(wywolania[0].dane.rysunek, undefined);
  assert.doesNotMatch(wywolania[0].instrukcja, /rysunek ucznia/);
});

Deno.test("Obraz o niedozwolonym typie albo z błędnym nagłówkiem jest odrzucany przed bazą", async () => {
  pytanieZBazy = null;
  for (const mime of ["image/svg+xml", "image/gif", "text/html"]) {
    await assert.rejects(
      ocenRozwiazanie({ proba: crypto.randomUUID(), arkusz: cel.arkusz, pytanie: cel.pytanie, odpowiedz: { obraz: { mime, base64: PNG } } }, "u", atrapa({}, []) as never),
      (e) => e instanceof BladApi && e.status === 400 && e.kod === "bad_image",
    );
  }
  await assert.rejects(
    ocenRozwiazanie({ proba: crypto.randomUUID(), arkusz: cel.arkusz, pytanie: cel.pytanie, odpowiedz: { obraz: { mime: "image/jpeg", base64: PNG } } }, "u", atrapa({}, []) as never),
    (e) => e instanceof BladApi && e.kod === "bad_image",
  );
});
