export const MIESIACE = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec",
  "sierpień", "wrzesień", "październik", "listopad", "grudzień",
];

export const ascii = (tekst) => tekst.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/\p{M}/gu, "");

export function identyfikator({ przedmiot = "angielski", poziom, rok, formula, termin, sesja = "maj", czesc }) {
  // Identyfikatory angielskiego z 2020 r. powstały przed uwzględnieniem przesunięcia matury.
  const staryMaj = przedmiot === "angielski" && formula === "2015" && rok === 2020 && termin === "glowny";
  return [przedmiot, poziom, rok, staryMaj ? "maj" : ascii(sesja), czesc && ascii(czesc).replace(/\s+/g, "-"),
    termin === "probny" && "probna", formula === "2015" && "formula-2015"].filter(Boolean).join("-");
}

export function terminMiesiaca(rok, miesiac) {
  if (rok === 2020) return { 5: "glowny", 6: "glowny", 7: "dodatkowy", 9: "poprawkowy" }[miesiac];
  return { 5: "glowny", 6: "dodatkowy", 8: "poprawkowy", 9: "poprawkowy" }[miesiac];
}
