import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { TopNav } from "./TopNav";
import { TutorDock } from "./TutorDock";
import { TutorGuide } from "./TutorGuide";
import { TutorProvider } from "./TutorContext";
import { useProfil, useSession } from "../auth";
import { useAiReady } from "../ai";
import { pobierzPostepy } from "../arkusze/postep";
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

  // Po zalogowaniu ściągamy postęp z konta, żeby lista arkuszy pokazała go od razu.
  useEffect(() => {
    if (userId) void pobierzPostepy(userId);
  }, [userId]);

  if (session === null) return null;
  if (!session) return <Navigate to="/logowanie" replace />;
  if (profil === undefined) return null;
  if (profil && !profil.onboarded_at) return <Navigate to="/witaj" replace />;

  // Pestka pojawia się dopiero, gdy konto ma podpięte AI.
  return (
    <TutorProvider ai={ai === true} przedmioty={opisPrzedmiotow(profil?.subjects ?? [])}>
      <TopNav />
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
