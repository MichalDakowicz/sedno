export function poczatekWypracowania(s, { poziom, czesc }) {
  return (poziom === "rozszerzony" || czesc === "Część 2")
    && /^(?:Wybierz jeden z (?:poniższych|podanych|dwóch)|(?:W\s+)?Wypracowani[eu]|Temat 1\.|Napisz wypracowanie)/i.test(s);
}

export function czyWypracowanie(przedmiot, tekst, punkty) {
  if (przedmiot === "polski") return /(?:wypracowani|napisz (?:rozprawkę|interpretację)|\bTemat\s+[12]\.)/i.test(tekst) && punkty >= 15;
  return punkty >= 10 && /wypracowani|rozprawk|wypowiedź (?:pisemną|argumentacyjną)|temat(?:ów|y)\b/i.test(tekst);
}
