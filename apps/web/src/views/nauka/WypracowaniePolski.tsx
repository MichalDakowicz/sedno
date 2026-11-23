import { useEffect, useState } from "react";
import { useSession } from "../../auth";
import { NaglowekStrony } from "../../components/NaglowekStrony";
import { useKontekstPestki } from "../../components/TutorContext";
import { Wypracowanie } from "../../components/Wypracowanie";
import styles from "./SzybkaRunda.module.css";

const POLECENIE = "Napisz wypracowanie na temat: Jak wybory bohatera wpływają na jego relacje z innymi? Uzasadnij stanowisko, odwołując się do lektury.";

export function WypracowaniePolski() {
  const session = useSession();
  return session ? <Szkic key={session.user.id} user={session.user.id} /> : null;
}

function Szkic({ user }: { user: string }) {
  const klucz = `sedno.wypracowanie-polski:${user}`;
  const [tekst, ustawTekst] = useState(() => {
    try {
      return localStorage.getItem(klucz) ?? "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(klucz, tekst);
    } catch {
      // Brak miejsca lub dostępu do pamięci przeglądarki.
    }
  }, [klucz, tekst]);

  useKontekstPestki({
    klucz: "wypracowanie-polski",
    tytul: "wypracowaniu z polskiego",
    opis: `Etap: szkic wypracowania. ${POLECENIE} Pomagaj w planie i redakcji. Nie pisz wypracowania za ucznia.`,
    przedmiot: "polski",
  });
  return (
    <main className={`container czytanie ${styles.strona}`}>
      <NaglowekStrony wstecz={{ do: "/nauka?przedmiot=polski", nazwa: "Nauka" }} tytul="Wypracowanie z polskiego" lead={POLECENIE} />
      <Wypracowanie jezyk="pl" tekst={tekst} onTekst={ustawTekst} tematy={[]} punkty={[]} polecenie={POLECENIE}
        zakres={null} temat={null} odhaczone={[]} tylkoOdczyt={false} onTemat={() => {}} onOdhacz={() => {}} />
    </main>
  );
}
