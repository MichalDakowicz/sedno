// Łączy wynik parsera arkusza z kluczem: ustala typ pytania, możliwe
// odpowiedzi (litery) i dane do sprawdzania.

const ZAKRES_LITER = /\(?\b([A-H])\s*[–-]\s*([A-H])\)?/;

export function scal(zadania, klucz) {
  const ostrzezenia = [];
  for (const z of zadania) {
    // Teksty A–C bywają rozdzielone akapitami, więc litery zbieramy ze wszystkich bloków opcji.
    const wszystkieOpcje = z.bloki.filter((b) => b.typ === "opcje").flatMap((b) => b.opcje);
    const opcjeZadania = wszystkieOpcje.length ? wszystkieOpcje : undefined;
    const zakres = [...z.polecenie, ...z.bloki.filter((b) => b.typ === "akapit").map((b) => b.tekst)].join(" ").match(ZAKRES_LITER);
    const literyZakresu = zakres ? litery(zakres[1], zakres[2]) : null;

    z.pytania = z.pytania.map((q) => {
      if (q.typ === "wypowiedz") return { ...q, punkty: z.punkty };
      const k = klucz[q.nr];
      if (!k) {
        ostrzezenia.push(`${q.nr}: brak w kluczu`);
        return { ...q, typ: "otwarte", punkty: 1 };
      }
      if (k.litera) {
        const wlasne = q.opcje?.map((o) => o.litera);
        // Prawda/fałsz (formuła 2015): klucz ma T albo F, arkusz nie ma opcji.
        const prawdaFalsz = !wlasne && (k.litera === "T" || z.pytania.some((x) => klucz[x.nr]?.litera === "T"));
        const mozliwe = prawdaFalsz ? ["T", "F"] : (wlasne ?? opcjeZadania?.map((o) => o.litera) ?? literyZakresu ?? ["A", "B", "C", "D"]);
        if (!mozliwe.includes(k.litera)) ostrzezenia.push(`${q.nr}: litera ${k.litera} spoza ${mozliwe.join("")}`);
        return { ...q, typ: "zamkniete", litery: mozliwe, poprawna: k.litera, punkty: 1 };
      }
      const { nr, litera, ...reszta } = k;
      // Starsze klucze podają tylko przykłady na 1 pkt, bez odpowiedzi oczekiwanej.
      if (!reszta.oczekiwane?.length && !reszta.akceptowane?.length) ostrzezenia.push(`${q.nr}: brak odpowiedzi w kluczu`);
      let tresc = q.tresc;
      // Luka w treści pytania bez numeru („Since we (be / not / inform) _____”).
      if (!q.wTekscie && tresc && !tresc.includes("{{")) tresc = tresc.replace(/_____(\s*_____)*/, `{{${q.nr}}}`);
      const { opcje, ...bezOpcji } = q;
      return { ...bezOpcji, tresc, typ: "otwarte", punkty: 1, ...reszta };
    });
  }
  return { zadania, ostrzezenia };
}

function litery(od, doo) {
  const wynik = [];
  for (let c = od.charCodeAt(0); c <= doo.charCodeAt(0); c++) wynik.push(String.fromCharCode(c));
  return wynik;
}
