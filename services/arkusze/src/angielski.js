import { kluczPisemny } from "./klucz-pisemny.js";

export function uzupelnijKluczAngielskiego(strony, zadania, ostrzezenia) {
  const klucz = kluczPisemny(strony);
  for (const z of zadania) {
    for (const p of z.pytania) {
      if (p.typ === "zamkniete" || p.oczekiwane?.length || p.akceptowane?.length) continue;
      const k = klucz[p.nr] ?? klucz[z.nr];
      if (!k || !k.zasady && !k.rozwiazanie) continue;
      p.zasadyStrona = k.strona;
      if (k.zasady) p.zasady = k.zasady;
      if (k.rozwiazanie) p.rozwiazanie = k.rozwiazanie;
      if (p.typ === "wypowiedz") continue;
      for (const suffix of [": brak w kluczu", ": brak odpowiedzi w kluczu"]) {
        const i = ostrzezenia.indexOf(p.nr + suffix);
        if (i >= 0 && klucz[p.nr]) ostrzezenia.splice(i, 1);
      }
    }
  }
}
