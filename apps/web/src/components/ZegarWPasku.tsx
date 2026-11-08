// Zegar arkusza na czas poza samym arkuszem: wyspa zostaje w górnym pasku na każdej stronie,
// a kliknięcie wraca do arkusza. W arkuszu zegarem zarządza widok arkusza (views/Arkusz.tsx).
import { useLocation, useNavigate } from "react-router-dom";
import { usePostep } from "../arkusze/postep";
import { useAktywnyZegar, type AktywnyZegar } from "../arkusze/zegarAktywny";
import { Zegar } from "./Zegar";

export function ZegarWPasku() {
  const aktywny = useAktywnyZegar();
  const { pathname } = useLocation();
  if (!aktywny || pathname === `/arkusze/${aktywny.id}`) return null;
  return <ZegarArkusza key={aktywny.id} aktywny={aktywny} />;
}

function ZegarArkusza({ aktywny }: { aktywny: AktywnyZegar }) {
  const [postep, zmien] = usePostep(aktywny.id);
  const navigate = useNavigate();
  if (!postep.czas || postep.sprawdzony) return null;
  return (
    <Zegar
      arkusz={aktywny.id}
      limitMin={aktywny.limitMin}
      czas={postep.czas}
      onZmien={(c) => zmien((p) => ({ ...p, czas: c }))}
      onWroc={() => navigate(`/arkusze/${aktywny.id}`)}
    />
  );
}
