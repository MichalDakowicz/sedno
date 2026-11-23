import { useEffect, useRef } from "react";
import { Navigate, Outlet, useLocation, useMatch } from "react-router-dom";
import { TopNav } from "./TopNav";
import { TutorDock } from "./TutorDock";
import { TutorGuide } from "./TutorGuide";
import { TutorProvider } from "./TutorContext";
import { Wyszukiwanie } from "./Wyszukiwanie";
import { ZegarWPasku } from "./ZegarWPasku";
import { useProfil, useSession } from "../auth";
import { useAiReady } from "../ai";
import { pobierzPostepy } from "../arkusze/postep";
import { pobierzRozmowy } from "../konto/rozmowy";
import { opisPrzedmiotow } from "../konto/przedmioty";
import { useRozgrzewanie } from "../nauka/rozgrzewanie";
import { oznaczStrone, zapamietajStrone } from "../ruch";
import styles from "../views/Tutor.module.css";

export function AppLayout() {
  const location = useLocation();
  const pelnyCzat = useMatch("/tutor") !== null;
  const bylWInnymWidoku = useRef(false);
  const session = useSession();
  const userId = session ? session.user.id : null;
  const profil = useProfil();
  const ai = useAiReady(userId);
  useRozgrzewanie();
  // Przed renderem treści: na stronie już obejrzanej wykresy i sekcje nie wjeżdżają drugi raz.
  oznaczStrone(location.pathname);
  useEffect(() => () => zapamietajStrone(location.pathname), [location.pathname]);

  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!pelnyCzat && profil?.onboarded_at) bylWInnymWidoku.current = true;
  }, [pelnyCzat, profil]);

  // Po zalogowaniu ściągamy postęp i rozmowy z Pestką z konta, żeby były od razu, także z innego urządzenia.
  useEffect(() => {
    if (!userId) return;
    void pobierzPostepy(userId);
    void pobierzRozmowy(userId);
    // Zapis rozmów mógł paść bez sieci: po jej powrocie nowsza lokalna wersja idzie na konto.
    const ponow = () => void pobierzRozmowy(userId);
    window.addEventListener("online", ponow);
    // Karta otwarta długo bez pobrania ma nieświeże rozmowy: pobieramy po powrocie do niej, najwyżej raz na 10 s.
    let ostatnie = Date.now();
    const odswiez = () => {
      if (document.visibilityState !== "visible" || Date.now() - ostatnie < 10_000) return;
      ostatnie = Date.now();
      ponow();
    };
    document.addEventListener("visibilitychange", odswiez);
    window.addEventListener("focus", odswiez);
    return () => {
      window.removeEventListener("online", ponow);
      document.removeEventListener("visibilitychange", odswiez);
      window.removeEventListener("focus", odswiez);
    };
  }, [userId]);

  if (session === null) return null;
  if (!session) return <Navigate to="/logowanie" replace />;
  if (profil === undefined) return null;
  if (profil && !profil.onboarded_at) return <Navigate to="/witaj" replace />;

  // Pestka jest na każdym koncie: przewodnik i dymki z gotowych tekstów działają bez AI, a to, co potrzebuje
  // modelu, sprawdza aiGotowe (rozmowa bez AI odsyła do profilu).
  return (
    <TutorProvider ai={ai} przedmioty={opisPrzedmiotow(profil?.subjects ?? [])}>
      <div className={pelnyCzat ? styles.okno : styles.uklad}>
        {/* Pełny czat ma własny nagłówek i panel; górny pasek zostaje poza nim. Wyszukiwanie (Ctrl+K) działa dalej. */}
        {!pelnyCzat && (
          <>
            <TopNav />
            <ZegarWPasku />
          </>
        )}
        <Wyszukiwanie />
        <Outlet context={pelnyCzat ? bylWInnymWidoku.current : undefined} />
        {!pelnyCzat && (
          <>
            <TutorGuide />
            <TutorDock />
          </>
        )}
      </div>
    </TutorProvider>
  );
}
