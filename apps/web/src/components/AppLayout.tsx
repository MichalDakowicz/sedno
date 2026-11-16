import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { TopNav } from "./TopNav";
import { TutorDock } from "./TutorDock";
import { TutorGuide } from "./TutorGuide";
import { TutorProvider } from "./TutorContext";
import { ZegarWPasku } from "./ZegarWPasku";
import { useProfil, useSession } from "../auth";
import { useAiReady } from "../ai";
import { pobierzPostepy } from "../arkusze/postep";
import { pobierzRozmowy } from "../konto/rozmowy";
import { opisPrzedmiotow } from "../konto/przedmioty";

export function AppLayout() {
  const location = useLocation();
  const session = useSession();
  const userId = session ? session.user.id : null;
  const profil = useProfil();
  const ai = useAiReady(userId);

  useEffect(() => {
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

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

  // Pestka pojawia się dopiero, gdy konto ma podpięte AI.
  return (
    <TutorProvider ai={ai === true} przedmioty={opisPrzedmiotow(profil?.subjects ?? [])}>
      <TopNav />
      <ZegarWPasku />
      <Outlet />
      {ai === true && location.pathname !== "/tutor" && (
        <>
          <TutorGuide />
          <TutorDock />
        </>
      )}
    </TutorProvider>
  );
}
