// Jeden zegar arkusza na czas dla całej aplikacji: wyspa w górnym pasku. Siedzi w układzie strony,
// więc przy przejściu między pulpitem a arkuszem się nie przeładowuje i nic nie miga. W arkuszu
// wysuwa pełny zegar (i da się go odpiąć), poza nim kliknięcie wraca do arkusza.
import { useLocation, useNavigate } from "react-router-dom";
import { usePostep } from "../arkusze/postep";
import { useAktywnyZegar, type AktywnyZegar } from "../arkusze/zegarAktywny";
import { Zegar } from "./Zegar";

export function ZegarWPasku() {
  const aktywny = useAktywnyZegar();
  if (!aktywny) return null;
  return <ZegarArkusza key={aktywny.id} aktywny={aktywny} />;
}

function ZegarArkusza({ aktywny }: { aktywny: AktywnyZegar }) {
  const [postep, zmien] = usePostep(aktywny.id);
  const navigate = useNavigate();
  const naArkuszu = useLocation().pathname === `/arkusze/${aktywny.id}`;
  if (!postep.czas || postep.sprawdzony) return null;
  return (
    <Zegar
      arkusz={aktywny.id}
      limitMin={aktywny.limitMin}
      czas={postep.czas}
      onZmien={(c) => zmien((p) => ({ ...p, czas: c }))}
      onWroc={naArkuszu ? undefined : () => navigate(`/arkusze/${aktywny.id}`)}
    />
  );
}
