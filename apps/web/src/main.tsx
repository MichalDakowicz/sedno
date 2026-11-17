import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "@fontsource-variable/inter";
import "./styles/global.css";
import { AppLayout } from "./components/AppLayout";
import { ScrollBar } from "./components/ScrollBar";
import { Login } from "./views/Login";
import { Dashboard } from "./views/Dashboard";
import { Tutor } from "./views/Tutor";
import { Profile } from "./views/Profile";
import { Ustawienia } from "./views/Ustawienia";
import { uruchomUstawienia } from "./konto/ustawienia";
import { uruchomProfilUcznia } from "./konto/profilUcznia";
import { ProfilUcznia } from "./views/ProfilUcznia";
import { Arkusze } from "./views/Arkusze";
import { Arkusz } from "./views/Arkusz";
import { Onboarding } from "./views/Onboarding";
import { Nauka, Powtorki, Spis, SzablonWidok, Umiejetnosci } from "./szablony/Szablony";

// Ustawienia stosują się od startu, nie dopiero na ich stronie.
uruchomUstawienia();
uruchomProfilUcznia();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/logowanie" element={<Login />} />
        <Route path="/witaj" element={<Onboarding />} />
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="przedmiot/:id" element={<Dashboard />} />
          <Route path="tutor" element={<Tutor />} />
          <Route path="nauka" element={<Nauka />} />
          <Route path="arkusze" element={<Arkusze />} />
          <Route path="arkusze/:id" element={<Arkusz />} />
          <Route path="umiejetnosci" element={<Umiejetnosci />} />
          <Route path="powtorki" element={<Powtorki />} />
          <Route path="szablony" element={<Spis />} />
          <Route path="szablony/:slug" element={<SzablonWidok />} />
          <Route path="profil" element={<Profile />} />
          <Route path="profil-ucznia" element={<ProfilUcznia />} />
          <Route path="ustawienia" element={<Ustawienia />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ScrollBar />
    </BrowserRouter>
  </StrictMode>,
);
