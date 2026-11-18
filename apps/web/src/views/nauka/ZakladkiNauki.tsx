// Zakładki działu Nauka: nauka, mapa umiejętności i powtórki to jedno miejsce w menu. Każda ma swój adres
// (/nauka, /umiejetnosci, /powtorki), więc stare linki działają, a wybrany poziom matury idzie z zakładki do zakładki.
import { Link, useLocation, useSearchParams } from "react-router-dom";

const ZAKLADKI = [
  { do: "/nauka", nazwa: "Ćwiczenia" },
  { do: "/umiejetnosci", nazwa: "Mapa umiejętności" },
  { do: "/powtorki", nazwa: "Powtórki" },
];

export function ZakladkiNauki() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const poziom = params.get("poziom");
  return (
    <nav className="pigulki" aria-label="Dział Nauka">
      {ZAKLADKI.map((z) => (
        <Link key={z.do} to={poziom ? `${z.do}?poziom=${poziom}` : z.do} className="pigulka" aria-current={pathname === z.do ? "page" : undefined}>
          {z.nazwa}
        </Link>
      ))}
    </nav>
  );
}
