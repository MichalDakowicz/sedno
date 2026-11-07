import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { FileText, GraduationCap, LayoutGrid, Menu, RotateCcw, Target, X } from "lucide-react";
import { logout } from "../auth";
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

  return (
    <div className={styles.wrap}>
      <nav className={styles.nav} aria-label="Główna">
        <Link to="/" className={styles.logo}>
          Sedno
        </Link>

        <ul className={styles.links} data-tutor="nav-links">
          {links.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) => `${styles.link} ${isActive || (end && onDashboard) ? styles.active : ""}`}
              >
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className={styles.right}>
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
