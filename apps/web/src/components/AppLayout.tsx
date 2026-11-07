import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { TopNav } from "./TopNav";
import { TutorDock } from "./TutorDock";
import { TutorGuide } from "./TutorGuide";
import { TutorProvider } from "./TutorContext";
import { useSession } from "../auth";
import { pobierzPostepy } from "../arkusze/postep";

export function AppLayout() {
  const location = useLocation();
  const session = useSession();
  const userId = session ? session.user.id : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Po zalogowaniu ściągamy postęp z konta, żeby lista arkuszy pokazała go od razu.
  useEffect(() => {
    if (userId) void pobierzPostepy(userId);
  }, [userId]);

  if (session === null) return null;
  if (!session) return <Navigate to="/logowanie" replace />;

  return (
    <TutorProvider>
      <TopNav />
      <Outlet />
      {location.pathname !== "/tutor" && (
        <>
          <TutorGuide />
          <TutorDock />
        </>
      )}
    </TutorProvider>
  );
}
