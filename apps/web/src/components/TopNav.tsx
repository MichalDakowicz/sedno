import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { CircleHelp, FileText, GraduationCap, LayoutGrid, Menu, RotateCcw, Target, X } from "lucide-react";
import { logout } from "../auth";
import { Plywak } from "./Plywak";
import { resetTour, useTutor } from "./TutorContext";
import styles from "./TopNav.module.css";

const links = [
  { to: "/", label: "Pulpit", icon: LayoutGrid, end: true },
  { to: "/nauka", label: "Nauka", icon: GraduationCap },
  { to: "/arkusze", label: "Arkusze", icon: FileText },
  { to: "/umiejetnosci", label: "Mapa umiejętności", icon: Target },
  { to: "/powtorki", label: "Powtórki", icon: RotateCcw },
];

export function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  function signOut() {
    void logout().then(() => navigate("/logowanie"));
  }

  // Pulpit przedmiotu też należy do „Pulpitu”.
  const onDashboard = location.pathname === "/" || location.pathname.startsWith("/przedmiot/");
  const { startTour } = useTutor();

  // Przewodnik zaczyna się na pulpicie ogólnym, więc z innej strony najpierw tam przechodzimy.
  function przewodnik() {
    resetTour();
    if (location.pathname === "/") startTour();
    else navigate("/");
  }

  return (
    <div className={styles.wrap}>
      <nav className={styles.nav} aria-label="Główna">
        <Link to="/" className={styles.logo}>
          Sedno
        </Link>

        {/* Środek paska: menu i miejsce na „wyspę” zegara arkusza (components/Zegar.tsx). Są wyśrodkowane
            razem, więc gdy wyspa się pojawia albo rozwija, menu przesuwa się płynnie. */}
        <div className={styles.srodek}>
          <ul className={styles.links} data-tutor="nav-links">
            <Plywak jako="li" zalezy={location.pathname} />
            {links.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  data-aktywny={end ? onDashboard : location.pathname === to || location.pathname.startsWith(`${to}/`)}
                  className={({ isActive }) => `${styles.link} ${isActive || (end && onDashboard) ? styles.active : ""}`}
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
                <NavLink to={to} end={end} className={({ isActive }) => (isActive || (end && onDashboard) ? styles.mobileActive : "")}>
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink to="/profil" className={({ isActive }) => (isActive ? styles.mobileActive : "")}>
                Profil
              </NavLink>
            </li>
          </ul>
          <button type="button" className="btn btn-ghost" onClick={signOut}>
            Wyloguj
          </button>
        </div>
      )}
    </div>
  );
}
