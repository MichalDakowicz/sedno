// Tylko w trybie deweloperskim (main.tsx): wspólne wykresy, emocje Pestki i stadia pestki obok siebie do sprawdzenia.
import { NaglowekStrony } from "../components/NaglowekStrony";
import { Kropki, Linia, OsCzasu, PasDni, PasekProgu, Pierscien } from "../components/wykresy";

export function Galeria() {
  return (
    <main className="container" style={{ display: "grid", gap: "var(--s-7)", paddingBottom: 160 }}>
      <NaglowekStrony etykieta="Tryb deweloperski" tytul="Galeria" lead="Wykresy, emocje i stadia." />
      <section style={{ display: "grid", gap: "var(--s-5)", maxWidth: 520 }}>
        <PasekProgu wartosc={0.42} prog={{ wartosc: 0.3, etykieta: "próg 30%" }} cel={{ wartosc: 0.6, etykieta: "cel 60%" }} opis="Prognoza 42%" />
        <PasekProgu wartosc={0.58} przed={0.41} gruby opis="Opanowanie z 41% do 58%" />
        <PasekProgu wartosc={0.9} cel={{ wartosc: 0.62, etykieta: "norma" }} ton="ponad" opis="Czas ponad normę" />
        <Linia punkty={[0.22, 0.35, 0.31, 0.48, 0.56]} prog={0.3} podpisOstatniego="56%" opis="Wyniki rosną" />
        <Kropki opis="Runda" kropki={[{ stan: "dobrze" }, { stan: "zle" }, { stan: "pominiete" }, { stan: "dobrze" }, { stan: "pusta", biezaca: true }, { stan: "pusta" }]} />
        <Kropki opis="Tydzień" rowno kropki={["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d, i) => ({ podpis: d, stan: i < 3 ? "pelna" : i === 4 ? "plan" : "pusta", biezaca: i === 3 }))} />
        <Kropki opis="Próby" rozmiar="male" kropki={[{ stan: "dobrze" }, { stan: "dobrze" }, { stan: "zle" }, { stan: "dobrze" }]} />
        <div style={{ display: "flex", gap: "var(--s-5)" }}>
          <Pierscien wartosc={0.64} prog={0.3} opis="64%" />
          <Pierscien wartosc={0.18} prog={0.3} rozmiar={48} opis="18%" />
        </div>
        <OsCzasu opis="Egzaminy" ile="168 dni" zdarzenia={[{ klucz: "a", etykieta: "Polski", opis: "5 maja", wyroznij: true }, { klucz: "b", etykieta: "Matematyka", opis: "7 maja" }, { klucz: "c", etykieta: "Angielski", opis: "12 maja" }]} />
        <PasDni opis="Powtórki" dni={["Cz", "Pt", "So", "Nd", "Pn", "Wt", "Śr"].map((d, i) => ({ klucz: d, podpis: d, liczba: [3, 0, 1, 0, 2, 5, 0][i]!, dzis: i === 0 }))} />
      </section>
    </main>
  );
}
