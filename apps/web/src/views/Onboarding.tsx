// Pierwsze wejście na konto: Pestka przedstawia się, pokazuje na prawdziwym zadaniu, jak uczy,
// i mówi, gdzie ją spotkać. Z AI na koncie pokaz idzie przez model; bez niego Pestka odpowiada
// przygotowanymi zdaniami i na końcu tłumaczy, jak podpiąć AI. Przechodzi się go raz na konto.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Hand, MessageCircle, MousePointerClick, Timer } from "lucide-react";
import { TutorAvatar, type AvatarState } from "../components/TutorAvatar";
import { resetTour } from "../components/TutorContext";
import { PodlaczAI } from "../components/PodlaczAI";
import { markOnboarded, useProfil, useSession } from "../auth";
import { streamAi, useAiReady } from "../ai";
import { rozmowa } from "../pestka";
import styles from "./Onboarding.module.css";

type Litera = "A" | "B" | "C" | "D";
type Wpis = { od: "tutor" | "uczen"; tekst: string; przygotowane?: boolean };

// Własne zadanie pokazowe (nie z arkusza CKE): zamknięte, z typowymi pułapkami w dystraktorach.
const OPCJE: { litera: Litera; tresc: ReactNode; tekst: string }[] = [
  { litera: "A", tresc: <>2<sup>3</sup></>, tekst: "2^3" },
  { litera: "B", tresc: <>2<sup>9</sup></>, tekst: "2^9" },
  { litera: "C", tresc: <>2<sup>−3</sup></>, tekst: "2^-3" },
  { litera: "D", tresc: <>2<sup>17</sup></>, tekst: "2^17" },
];
const POPRAWNA: Litera = "A";
const ZADANIE_TEKST =
  "Matematyka, poziom podstawowy, zadanie zamknięte. Liczba (2^10 · 2^-4) : 2^3 jest równa: A. 2^3, B. 2^9, C. 2^-3, D. 2^17. Poprawna odpowiedź: A.";

const REAKCJA: Record<Litera, string> = {
  A: "Zgadza się. Zanim pójdziemy dalej: dlaczego przy dzieleniu przez 2³ odejmujesz trójkę, a nie dzielisz wykładników?",
  B: "Blisko. Spójrz na ostatni krok: co dzieje się z wykładnikiem, gdy dzielisz przez 2³, a nie mnożysz?",
  C: "Skąd minus? Zacznij od licznika: jak zapiszesz 2¹⁰ · 2⁻⁴ jako jedną potęgę?",
  D: "Popatrz na znak przy czwórce w 2⁻⁴. Co robi minus w wykładniku, gdy mnożysz potęgi o tej samej podstawie?",
};
const DRUGA_ODPOWIEDZ =
  "Właśnie tak: przy mnożeniu potęg o tej samej podstawie dodajesz wykładniki, przy dzieleniu odejmujesz. Tak pracujemy: ja pytam, ty dochodzisz do odpowiedzi.";

const KROKI = ["Cześć", "Pokaz", "Gdzie mnie spotkasz", "Start"];

export function Onboarding() {
  const session = useSession();
  const profil = useProfil();
  const ai = useAiReady(session ? session.user.id : null);
  const navigate = useNavigate();
  const [krok, setKrok] = useState(0);

  if (session === false) return <Navigate to="/logowanie" replace />;
  if (!session || profil === undefined || ai === undefined) return null;

  const imie = profil?.display_name?.split(" ")[0];

  async function zakoncz(dokad: string) {
    await markOnboarded();
    if (dokad === "/") resetTour();
    navigate(dokad);
  }

  return (
    <div className={styles.page}>
      <header className={`container ${styles.top}`}>
        <span className={styles.logo}>Sedno</span>
        <ol className={styles.progress} aria-label="Postęp">
          {KROKI.map((k, i) => (
            <li key={k} className={i <= krok ? styles.done : undefined} aria-current={i === krok ? "step" : undefined}>
              <span className="visually-hidden">{k}</span>
            </li>
          ))}
        </ol>
        <button type="button" className={styles.skip} onClick={() => void zakoncz("/")}>
          Pomiń
        </button>
      </header>

      <main className={`container ${styles.main}`}>
        {krok === 0 && (
          <section className={styles.step}>
            <TutorAvatar size={88} state="talking" />
            <h1 className="display">
              Cześć{imie ? `, ${imie}` : ""}! <span className="accent">Jestem Pestka.</span>
            </h1>
            <p className="lead">Będę twoją tutorką w Sedno. Nie podaję gotowych odpowiedzi: zadaję pytania, aż dojdziesz do rozwiązania. Tak zostaje w głowie dłużej.</p>
            <button type="button" className="btn btn-primary" onClick={() => setKrok(1)}>
              Pokaż, jak to działa
            </button>
          </section>
        )}

        {krok === 1 && <Pokaz ai={ai} onDalej={() => setKrok(2)} />}

        {krok === 2 && (
          <section className={styles.step}>
            <TutorAvatar size={64} />
            <h1 className="h1">Gdzie mnie spotkasz</h1>
            <ul className={styles.where}>
              <li>
                <MessageCircle size={20} aria-hidden="true" />
                <span>Siedzę w rogu ekranu. Kliknij mnie, żeby porozmawiać o tym, co właśnie ćwiczysz.</span>
              </li>
              <li>
                <Hand size={20} aria-hidden="true" />
                <span>Przychodzę do przycisku, który polecam, i mówię dlaczego. Ty decydujesz, czy klikasz.</span>
              </li>
              <li>
                <MousePointerClick size={20} aria-hidden="true" />
                <span>Prawy przycisk myszy w dowolnym miejscu (na telefonie przytrzymaj palec) przywołuje mnie tam, gdzie jesteś.</span>
              </li>
              <li>
                <Timer size={20} aria-hidden="true" />
                <span>W trybie egzaminu milczę. Odezwę się dopiero przy sprawdzaniu.</span>
              </li>
            </ul>
            <button type="button" className="btn btn-primary" onClick={() => setKrok(3)}>
              Dalej
            </button>
          </section>
        )}

        {krok === 3 &&
          (ai ? (
            <section className={styles.step}>
              <TutorAvatar size={64} state="talking" />
              <h1 className="h1">Wszystko gotowe</h1>
              <p className="lead">Twoje konto ma podpięte AI, więc odpowiadam naprawdę. Na pulpicie oprowadzę cię po aplikacji.</p>
              <button type="button" className="btn btn-primary" onClick={() => void zakoncz("/")}>
                Przejdź do pulpitu
              </button>
            </section>
          ) : (
            <section className={styles.step}>
              <TutorAvatar size={64} />
              <h1 className="h1">Pojawię się po podpięciu AI</h1>
              <p className="lead">
                Sedno nie ma wspólnego klucza do AI: każde konto podpina własnego dostawcę. Dopóki tego nie zrobisz, nie będzie mnie w aplikacji, a arkusze
                sprawdzają się bez mojego komentarza.
              </p>
              <PodlaczAI onGo={() => void markOnboarded()} />
              <button type="button" className={styles.later} onClick={() => void zakoncz("/")}>
                Na razie bez Pestki
              </button>
            </section>
          ))}
      </main>
    </div>
  );
}

function Pokaz({ ai, onDalej }: { ai: boolean; onDalej: () => void }) {
  const [wybor, setWybor] = useState<Litera | null>(null);
  const [wpisy, setWpisy] = useState<Wpis[]>([]);
  const [stan, setStan] = useState<AvatarState>("idle");
  const [szkic, setSzkic] = useState("");
  const listaRef = useRef<HTMLDivElement>(null);
  const tury = wpisy.filter((w) => w.od === "uczen").length;

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [wpisy]);

  // Z AI odpowiada model; bez niego (albo gdy model zawiedzie) przygotowane zdanie, wyraźnie oznaczone.
  async function odpowiedz(historia: Wpis[], zapas: string) {
    setStan("thinking");
    if (ai) {
      let tekst = "";
      let pierwszy = true;
      try {
        await streamAi(
          { tier: "lekkie", task: "onboarding-pokaz", maxTokens: 1500, messages: rozmowa({ przedmiot: "matematyka (poziom podstawowy)", umiejetnosc: "działania na potęgach", zadanie: ZADANIE_TEKST }, historia) },
          (d) => {
            tekst += d;
            const dodaj = pierwszy;
            pierwszy = false;
            setStan("talking");
            setWpisy((w) => (dodaj ? [...w, { od: "tutor", tekst }] : w.map((x, i) => (i === w.length - 1 ? { ...x, tekst } : x))));
          },
        );
        if (tekst.trim()) return setStan("idle");
      } catch {
        // model nie odpowiedział: niżej przygotowana odpowiedź
      }
      if (!pierwszy) return setStan("idle");
    }
    await new Promise((r) => setTimeout(r, 700));
    setStan("talking");
    setWpisy((w) => [...w, { od: "tutor", tekst: zapas, przygotowane: true }]);
    setTimeout(() => setStan("idle"), 1500);
  }

  function wybierz(l: Litera) {
    if (wybor) return;
    setWybor(l);
    const opcja = OPCJE.find((o) => o.litera === l)!;
    const historia: Wpis[] = [{ od: "uczen", tekst: `Wybieram ${l}. ${opcja.tekst}.` }];
    setWpisy(historia);
    void odpowiedz(historia, REAKCJA[l]);
  }

  function wyslij(e: FormEvent) {
    e.preventDefault();
    const tekst = szkic.trim();
    if (!tekst || stan === "thinking") return;
    setSzkic("");
    const historia: Wpis[] = [...wpisy, { od: "uczen", tekst }];
    setWpisy(historia);
    void odpowiedz(historia, DRUGA_ODPOWIEDZ);
  }

  return (
    <section className={styles.step}>
      <span className="label">Pokaz · {ai ? "odpowiada AI z twojego konta" : "bez AI: odpowiedzi przygotowane"}</span>
      <h1 className="h1">Rozwiąż, a ja zareaguję</h1>

      <div className={styles.task}>
        <p className="small muted">Matematyka · poziom podstawowy · zadanie zamknięte</p>
        <p className={styles.question}>
          Liczba (2<sup>10</sup> · 2<sup>−4</sup>) : 2<sup>3</sup> jest równa:
        </p>
        <div className={styles.options} role="radiogroup" aria-label="Odpowiedzi">
          {OPCJE.map((o) => (
            <button
              key={o.litera}
              type="button"
              role="radio"
              aria-checked={wybor === o.litera}
              // Po błędnym wyborze nie zdradzamy poprawnej: od tego jest Pestka.
              className={[styles.option, wybor === o.litera ? (o.litera === POPRAWNA ? styles.right : styles.wrong) : ""].join(" ")}
              onClick={() => wybierz(o.litera)}
              disabled={!!wybor}
            >
              <span className={styles.letter}>{o.litera}</span>
              <span>{o.tresc}</span>
            </button>
          ))}
        </div>
      </div>

      {wpisy.length > 0 && (
        <div className={styles.chat} ref={listaRef} aria-live="polite">
          {wpisy.map((w, i) =>
            w.od === "tutor" ? (
              <div key={i} className={styles.tutorRow}>
                <TutorAvatar size={32} state={i === wpisy.length - 1 ? stan : "idle"} />
                <div>
                  <p className={styles.tutorText}>{w.tekst}</p>
                  {w.przygotowane && <p className={styles.note}>Odpowiedź przygotowana na pokaz. Po podpięciu AI odpowiem naprawdę.</p>}
                </div>
              </div>
            ) : (
              <p key={i} className={styles.studentText}>
                {w.tekst}
              </p>
            ),
          )}
          {stan === "thinking" && (
            <div className={styles.tutorRow}>
              <TutorAvatar size={32} state="thinking" />
              <span className={styles.typing} aria-label="Pestka pisze">
                <i />
                <i />
                <i />
              </span>
            </div>
          )}
        </div>
      )}

      {wybor && tury < 3 && (
        <form className={styles.reply} onSubmit={wyslij}>
          <label htmlFor="pokaz-odp" className="visually-hidden">
            Odpowiedz Pestce
          </label>
          <input id="pokaz-odp" className="input" placeholder="Odpowiedz własnymi słowami…" value={szkic} onChange={(e) => setSzkic(e.target.value)} autoComplete="off" />
          <button type="submit" className="btn btn-secondary" disabled={!szkic.trim() || stan === "thinking"}>
            Wyślij
          </button>
        </form>
      )}

      {tury >= 2 && stan === "idle" && (
        <button type="button" className="btn btn-primary" onClick={onDalej}>
          Dalej
        </button>
      )}
      {wybor && tury < 2 && (
        <button type="button" className={styles.later} onClick={onDalej}>
          Pomiń pokaz
        </button>
      )}
    </section>
  );
}
