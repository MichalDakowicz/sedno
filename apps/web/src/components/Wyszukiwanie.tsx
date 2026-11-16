import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CornerDownLeft, FileText, LayoutGrid, MessageCircle, Search, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useListaArkuszy } from "../arkusze/dane";
import { useProfil } from "../auth";
import { nazwaPoziomu, przedmiot } from "../konto/przedmioty";
import { useTutor } from "./TutorContext";
import { szukaj, wczytajOstatnie, zapamietajOstatnie, type RodzajWyniku, type Wynik } from "./szukaj";
import styles from "./Wyszukiwanie.module.css";

/** Zdarzenie, którym lupa w pasku otwiera okno. */
export const OTWORZ_SZUKAJ = "sedno-szukaj";

const IKONY: Record<RodzajWyniku, LucideIcon> = { akcja: LayoutGrid, arkusz: FileText, rozmowa: MessageCircle };
const GRUPY: { rodzaj: RodzajWyniku; nazwa: string; limit: number }[] = [
  { rodzaj: "akcja", nazwa: "Akcje", limit: 5 },
  { rodzaj: "arkusz", nazwa: "Arkusze", limit: 6 },
  { rodzaj: "rozmowa", nazwa: "Rozmowy z Pestką", limit: 4 },
];

const AKCJE: Wynik[] = [
  { id: "akcja:pulpit", rodzaj: "akcja", tytul: "Pulpit", szukaj: "pulpit strona glowna start", sciezka: "/" },
  { id: "akcja:arkusze", rodzaj: "akcja", tytul: "Arkusze", opis: "Arkusze maturalne CKE", szukaj: "arkusze arkusz matura cke", sciezka: "/arkusze" },
  { id: "akcja:pestka", rodzaj: "akcja", tytul: "Rozmowa z Pestką", opis: "Tutor AI", szukaj: "rozmowa pestka tutor czat pytanie", sciezka: "/tutor" },
  { id: "akcja:profil", rodzaj: "akcja", tytul: "Profil", opis: "Przedmioty i ustawienia konta", szukaj: "profil konto przedmioty ustawienia", sciezka: "/profil" },
];

type Pozycja = Wynik | "pestka";

export function Wyszukiwanie() {
  const [otwarte, setOtwarte] = useState(false);

  useEffect(() => {
    const otworz = () => setOtwarte(true);
    const klawisz = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOtwarte(true);
      }
    };
    window.addEventListener(OTWORZ_SZUKAJ, otworz);
    window.addEventListener("keydown", klawisz);
    return () => {
      window.removeEventListener(OTWORZ_SZUKAJ, otworz);
      window.removeEventListener("keydown", klawisz);
    };
  }, []);

  return otwarte ? <Okno zamknij={() => setOtwarte(false)} /> : null;
}

function Okno({ zamknij }: { zamknij: () => void }) {
  const navigate = useNavigate();
  const { rozmowy, otworzRozmowe, send } = useTutor();
  const { dane: arkusze } = useListaArkuszy();
  const profil = useProfil();
  const [tekst, setTekst] = useState("");
  const [wybrany, setWybrany] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // Fokus wraca tam, skąd okno otwarto (lupa, skrót z dowolnego miejsca).
  useLayoutEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.showModal();
    return () => opener?.focus();
  }, []);

  const indeks = useMemo<Wynik[]>(() => {
    const moje = new Set<string>(profil?.subjects.map((s) => s.id));
    const sheety = (arkusze ?? []).map<Wynik>((a) => {
      const nazwa = przedmiot(a.przedmiot)?.nazwa ?? a.przedmiot;
      return {
        id: `arkusz:${a.id}`,
        rodzaj: "arkusz",
        tytul: `${nazwa} ${nazwaPoziomu[a.poziom]}, ${a.sesja} ${a.rok}`,
        szukaj: `${nazwa} ${nazwaPoziomu[a.poziom]} ${a.sesja} ${a.rok} ${a.symbol} arkusz`,
        sciezka: `/arkusze/${a.id}`,
        premia: moje.has(a.przedmiot) ? 0.5 : 0,
      };
    });
    const chaty = rozmowy.map<Wynik>((r) => ({
      id: `rozmowa:${r.id}`,
      rodzaj: "rozmowa",
      tytul: r.tytul,
      szukaj: `${r.tytul} ${r.wiadomosci.map((m) => m.text).join(" ")}`,
      sciezka: "/tutor",
      rozmowaId: r.id,
    }));
    return [...AKCJE, ...sheety, ...chaty];
  }, [arkusze, profil, rozmowy]);

  const pytanie = tekst.trim();
  // Pytanie pełnym zdaniem trafia do Pestki przed wynikami, krótkie hasło za nimi.
  const pestkaPierwsza = pytanie.includes("?") || pytanie.split(/\s+/).length >= 4;

  const grupy = useMemo(() => {
    if (!pytanie) {
      const poId = new Map(indeks.map((w) => [w.id, w]));
      const ostatnie = wczytajOstatnie().flatMap((x) => poId.get(x) ?? []);
      const polecane = AKCJE.filter((a) => !ostatnie.some((o) => o.id === a.id));
      return [
        { nazwa: "Ostatnie", wyniki: ostatnie },
        { nazwa: "Polecane", wyniki: polecane },
      ].filter((g) => g.wyniki.length);
    }
    const trafione = szukaj(pytanie, indeks);
    return GRUPY.map((g) => ({ nazwa: g.nazwa, wyniki: trafione.filter((w) => w.rodzaj === g.rodzaj).slice(0, g.limit) })).filter((g) => g.wyniki.length);
  }, [pytanie, indeks]);

  const plaska = useMemo<Pozycja[]>(() => {
    const w = grupy.flatMap((g) => g.wyniki);
    if (!pytanie) return w;
    return pestkaPierwsza ? ["pestka", ...w] : [...w, "pestka"];
  }, [grupy, pytanie, pestkaPierwsza]);

  useEffect(() => setWybrany(0), [pytanie]);
  useEffect(() => {
    listaRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [wybrany, plaska]);

  function otworz(p: Pozycja) {
    if (p === "pestka") {
      send(pytanie);
      navigate("/tutor");
    } else {
      zapamietajOstatnie(p.id);
      if (p.rozmowaId) otworzRozmowe(p.rozmowaId);
      navigate(p.sciezka);
    }
    zamknij();
  }

  function klawisz(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = plaska.length;
      if (n) setWybrany((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + n) % n);
    } else if (e.key === "Enter" && plaska[wybrany]) {
      e.preventDefault();
      otworz(plaska[wybrany]);
    }
  }

  const idPozycji = (i: number) => `${id}-${i}`;
  const wiersz = (p: Pozycja) => {
    const i = plaska.indexOf(p);
    const Ikona = p === "pestka" ? Sparkles : IKONY[p.rodzaj];
    return (
      <li
        key={p === "pestka" ? "pestka" : p.id}
        id={idPozycji(i)}
        role="option"
        aria-selected={i === wybrany}
        className={styles.wiersz}
        onMouseMove={() => i !== wybrany && setWybrany(i)}
        onClick={() => otworz(p)}
      >
        <Ikona size={16} aria-hidden="true" />
        <span className={styles.tekst}>
          <span>{p === "pestka" ? `Zapytaj Pestkę: „${pytanie}”` : p.tytul}</span>
          {p !== "pestka" && p.opis && <span className="muted small">{p.opis}</span>}
        </span>
        {i === wybrany && <CornerDownLeft size={14} aria-hidden="true" />}
      </li>
    );
  };

  const blokPestki = pytanie ? (
    <div key="pestka" className={styles.grupa} role="group" aria-label="Pestka">
      <span className="label" aria-hidden="true">
        Pestka
      </span>
      <ul role="presentation">{wiersz("pestka")}</ul>
    </div>
  ) : null;
  const bloki = grupy.map((g) => (
    <div key={g.nazwa} className={styles.grupa} role="group" aria-label={g.nazwa}>
      <span className="label" aria-hidden="true">
        {g.nazwa}
      </span>
      <ul role="presentation">{g.wyniki.map(wiersz)}</ul>
    </div>
  ));

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label="Szukaj"
      onCancel={(e) => {
        e.preventDefault();
        zamknij();
      }}
      onClick={(e) => e.target === e.currentTarget && zamknij()}
    >
      <div className={styles.pole}>
        <Search size={18} aria-hidden="true" />
        <input
          autoFocus
          className={styles.input}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={`${id}-lista`}
          aria-activedescendant={plaska.length ? idPozycji(wybrany) : undefined}
          aria-autocomplete="list"
          aria-label="Szukaj arkuszy, akcji i rozmów albo zadaj pytanie Pestce"
          placeholder="Szukaj albo zadaj pytanie Pestce"
          autoComplete="off"
          spellCheck={false}
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          onKeyDown={klawisz}
        />
      </div>
      <div ref={listaRef} className={styles.lista} id={`${id}-lista`} role="listbox" aria-label="Wyniki">
        {pestkaPierwsza ? [blokPestki, ...bloki] : [...bloki, blokPestki]}
        {pytanie && grupy.length === 0 && <p className={`muted small ${styles.pusto}`}>Nic nie znalazłam. Możesz zapytać Pestkę.</p>}
      </div>
      <p className={`muted small ${styles.stopka}`}>↑↓ wybierz · Enter otwórz · Esc zamknij</p>
    </dialog>
  );
}
