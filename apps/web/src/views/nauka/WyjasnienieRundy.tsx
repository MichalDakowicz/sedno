// „Wyjaśnij z Pestką” przy zadaniu CKE w rundzie: ta sama karta i ten sam prompt co przy omawianiu
// błędów w sprawdzonym arkuszu, zawężone do jednego pytania z odpowiedzią ucznia.
import { useMemo } from "react";
import { useArkusz } from "../../arkusze/dane";
import type { Postep } from "../../arkusze/postep";
import { nazwaZadaniaCke } from "../../arkusze/typy";
import { Ladowanie } from "../../components/Ladowanie";
import { OmowienieBledow, type Wiadomosc } from "../../components/OmowienieBledow";
import type { OdpowiedzNauki, PolecenieNauki } from "../../nauka/api";
import { odczytajRunde, zapiszRunde } from "./sesjaRundy";

export function WyjasnienieRundy({ odpowiedz, prompt, sesja, onZamknij }: {
  odpowiedz: OdpowiedzNauki;
  prompt: Extract<PolecenieNauki, { typ: "cke" }>;
  sesja: string;
  onZamknij: () => void;
}) {
  const { dane, laduje } = useArkusz(prompt.sheet_id);
  // Rozmowa wraca po odświeżeniu karty przeglądarki, jak w arkuszu.
  const klucz = `sedno.nauka.wyjasnienie:${sesja}:${odpowiedz.position}`;
  const zadanie = dane?.zadania.find((z) => z.nr === prompt.task_nr);
  const pytanie = zadanie?.pytania.find((p) => p.nr === prompt.question);
  const tylkoTo = useMemo(() => (zadanie && pytanie ? { ...zadanie, pytania: [pytanie] } : null), [zadanie, pytanie]);
  const postep = useMemo<Postep | null>(() => {
    if (!tylkoTo || !pytanie) return null;
    const zapisana = odczytajRunde<Wiadomosc[]>(klucz);
    return {
      odpowiedzi: { [pytanie.nr]: odpowiedz.answer },
      samoocena: {},
      sprawdzony: true,
      sprawdzoneZadania: [tylkoTo.nr],
      rozmowyOmowien: Array.isArray(zapisana) ? { [tylkoTo.nr]: zapisana } : undefined,
    };
  }, [tylkoTo, pytanie, odpowiedz.answer, klucz]);

  if (laduje) return <Ladowanie ksztalt="blok" etykieta="Pestka czyta zadanie" />;
  if (!dane || !tylkoTo || !postep) return <p role="alert">Nie udało się wczytać treści zadania do wyjaśnienia.</p>;
  return (
    <OmowienieBledow
      arkusz={dane}
      postep={postep}
      d={{ zadanie: tylkoTo, wypracowanie: false }}
      numer={1}
      wszystkich={1}
      etykieta={nazwaZadaniaCke(prompt.sheet_id, prompt.question)}
      onDalej={onZamknij}
      onZamknij={onZamknij}
      onWynikPrzykladu={() => {}}
      onZapiszRozmowe={(_, rozmowa) => zapiszRunde(klucz, rozmowa)}
    />
  );
}
