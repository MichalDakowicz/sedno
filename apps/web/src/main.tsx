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
import { Placeholder } from "./views/Placeholder";
import { Profile } from "./views/Profile";
import { Arkusze } from "./views/Arkusze";
import { Arkusz } from "./views/Arkusz";
import { Onboarding } from "./views/Onboarding";

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
          <Route path="nauka" element={<Placeholder title="Nauka" sub="Ścieżki umiejętności, formaty nauki i wolny wybór tematu." />} />
          <Route path="arkusze" element={<Arkusze />} />
          <Route path="arkusze/:id" element={<Arkusz />} />
          <Route path="umiejetnosci" element={<Placeholder title="Mapa umiejętności" sub="Pełna mapa opanowania z kodami wymagań w drugim planie." />} />
          <Route path="powtorki" element={<Placeholder title="Powtórki" sub="Umiejętności, które zaczynają zanikać, i błędy do przećwiczenia." />} />
          <Route path="profil" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ScrollBar />
    </BrowserRouter>
  </StrictMode>,
);
