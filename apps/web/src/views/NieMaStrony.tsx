// Nieznany adres: zamiast cichego przekierowania na pulpit Pestka mówi, że takiej strony nie ma, i prowadzi dalej.
import { useLocation } from "react-router-dom";
import { NaglowekStrony } from "../components/NaglowekStrony";
import { StanPestki } from "../components/StanPestki";
import { glos, wybierz } from "../pestka/glos";

export function NieMaStrony() {
  const { pathname } = useLocation();
  return (
    <main className="container czytanie" style={{ display: "grid", gap: "var(--s-7)", paddingTop: "var(--s-6)", paddingBottom: 160 }}>
      <NaglowekStrony etykieta="Błąd 404" tytul="Nie ma takiej strony" />
      <StanPestki rozmiar="duzy" emocja="zmartwienie" tekst={wybierz(glos.bledy.nieZnaleziono, pathname.length)}
        akcja={{ etykieta: "Wróć na pulpit", do: "/" }}>
        <p className="small muted">Adres: <code>{pathname}</code></p>
      </StanPestki>
    </main>
  );
}
