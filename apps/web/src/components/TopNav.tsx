import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, CircleHelp, Search, FileText, GraduationCap, LayoutGrid, Map as MapaIkona, Menu, MessageCircle, Settings, UserRound, X } from "lucide-react";
import { logout } from "../auth";
import { Znak } from "./Znak";
import { Plywak } from "./Plywak";
import { resetTour, useTutor } from "./TutorContext";
import { OTWORZ_SZUKAJ } from "./Wyszukiwanie";
import styles from "./TopNav.module.css";
import { mniejRuchu } from "../ruch";
import { rozgrzewajLink } from "../nauka/rozgrzewanie";

const links = [
  { to: "/", label: "Pulpit", icon: LayoutGrid, end: true },
  { to: "/nauka", label: "Nauka", icon: GraduationCap, tutor: "nav-nauka" },
  { to: "/arkusze", label: "Arkusze", icon: FileText, tutor: "nav-arkusze" },
  { to: "/umiejetnosci", label: "Mapa umiejętności", icon: MapaIkona, tutor: "nav-mapa" },
];

const DODATKOWE = [
  { to: "/tutor", label: "Pestka", icon: MessageCircle },
  { to: "/do-matury", label: "Do matury", icon: CalendarDays },
  { to: "/profil", label: "Profil", icon: UserRound },
  { to: "/ustawienia", label: "Ustawienia", icon: Settings },
];

export function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  // Gdy wyspa zegara się pojawia albo znika, menu nie przeskakuje: zapamiętujemy, gdzie było,
  // i po zmianie dociągamy je z poprzedniego miejsca (FLIP).
  const linksRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const slot = document.getElementById("wyspa-zegara");
    const ul = linksRef.current;
    if (!slot || !ul) return;
    let ostatnio = ul.getBoundingClientRect().left;
    const zmiana = () => {
      const r = ul.getBoundingClientRect();
      if (r.width && Math.abs(ostatnio - r.left) > 1 && !mniejRuchu())
        ul.animate([{ transform: `translateX(${ostatnio - r.left}px)` }, { transform: "translateX(0)" }], {
          duration: 420,
          easing: "cubic-bezier(0.32, 1.2, 0.5, 1)",
        });
      ostatnio = r.left;
    };
    const mo = new MutationObserver(zmiana);
    mo.observe(slot, { childList: true });
    // Zegar daje znać, gdy wyspa chowa się albo wraca bez zmiany w drzewie (odpięcie zegara).
    window.addEventListener("sedno-wyspa", zmiana);
    const ro = new ResizeObserver(() => (ostatnio = ul.getBoundingClientRect().left));
    ro.observe(document.body);
    return () => {
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("sedno-wyspa", zmiana);
    };
  }, []);

  function signOut() {
    void logout().then(() => navigate("/logowanie"));
  }

  // Pulpit przedmiotu też należy do „Pulpitu”.
  const onDashboard = location.pathname === "/" || location.pathname.startsWith("/przedmiot/");
  const aktywny = (to: string, end?: boolean) =>
    end ? onDashboard : location.pathname === to || location.pathname.startsWith(`${to}/`);
  const { startTour } = useTutor();

  // Przewodnik zaczyna się na pulpicie ogólnym, więc z innej strony najpierw tam przechodzimy.
  function przewodnik() {
    resetTour();
    if (location.pathname === "/") startTour();
    else navigate("/");
  }

  return (
    <div className={styles.wrap} data-ksztalt="wrap">
      <nav className={styles.nav} aria-label="Główna" data-ksztalt="nav">
        <Link to="/" className={styles.logo} aria-label="Sedno, pulpit" data-tutor="logo">
          <Znak />
        </Link>

        {/* Środek paska: menu i miejsce na „wyspę” zegara arkusza (components/Zegar.tsx). Są wyśrodkowane
            razem, więc gdy wyspa się pojawia albo rozwija, menu przesuwa się płynnie. */}
        <div className={styles.srodek}>
          <ul ref={linksRef} className={styles.links} data-tutor="nav-links">
            <Plywak jako="li" zalezy={location.pathname} />
            {links.map(({ to, label, icon: Icon, end, tutor }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  data-tutor={tutor}
                  data-aktywny={aktywny(to, end)}
                  className={`${styles.link} ${aktywny(to, end) ? styles.active : ""}`}
                  aria-current={aktywny(to, end) ? "page" : undefined}
                >
                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div id="wyspa-zegara" className={styles.wyspa} />
        </div>

        <div className={styles.right}>
          <button
            type="button"
            className={styles.pomoc}
            onClick={() => window.dispatchEvent(new Event(OTWORZ_SZUKAJ))}
            aria-label="Szukaj"
            aria-keyshortcuts="Control+K Meta+K"
            data-tutor="nav-search"
            title="Szukaj (Ctrl+K)"
          >
            <Search size={22} aria-hidden="true" />
          </button>
          <button type="button" className={styles.pomoc} onClick={przewodnik} aria-label="Pokaż przewodnik z Pestką" title="Przewodnik z Pestką">
            <CircleHelp size={22} aria-hidden="true" />
          </button>
          <Link to="/profil" className={styles.profile} aria-label="Profil">
            O
          </Link>
          <button
            type="button"
            className={styles.menuBtn}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            data-tutor="nav-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="visually-hidden">Menu</span>
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div id="mobile-menu" className={styles.mobileMenu}>
          <ul>
            {links.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={aktywny(to, end) ? styles.mobileActive : ""} aria-current={aktywny(to, end) ? "page" : undefined} {...rozgrzewajLink(to)}>
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          {/* Na telefonie nie ma przycisku profilu ani stałego miejsca Pestki, więc te strony są w menu. */}
          <ul>
            {DODATKOWE.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} className={({ isActive }) => (isActive ? styles.mobileActive : "")}>
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-ghost" onClick={signOut}>
            Wyloguj
          </button>
        </div>
      )}
    </div>
  );
}
