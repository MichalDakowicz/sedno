// Pierwsze wejście na konto: Pestka przedstawia się, uczeń wybiera przedmioty maturalne, Pestka
// pokazuje na zadaniu z jednego z nich, jak uczy, i mówi, gdzie ją spotkać. Z AI na koncie pokaz
// idzie przez model; bez niego Pestka odpowiada przygotowanymi zdaniami i na końcu tłumaczy,
// jak podpiąć AI. Przechodzi się go raz na konto.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Hand, MessageCircle, MousePointerClick, Timer } from "lucide-react";
import { TutorAvatar, type AvatarState } from "../components/TutorAvatar";
import { resetTour } from "../components/TutorContext";
import { PodlaczAI } from "../components/PodlaczAI";
import { Markdown } from "../components/Markdown";
import { WyborPrzedmiotow } from "../components/WyborPrzedmiotow";
import { SubjectIcon } from "../components/icons";
import { markOnboarded, saveSubjects, useProfil, useSession } from "../auth";
import { streamAi, useAiReady } from "../ai";
import { bezEmoji, powtarzaTutora, rozmowa } from "../pestka";
import { przedmiot, type MojPrzedmiot, type PrzedmiotId } from "../konto/przedmioty";
import styles from "./Onboarding.module.css";

type Litera = "A" | "B" | "C" | "D";
type Wpis = { od: "tutor" | "uczen"; tekst: string; przygotowane?: boolean; powtorzenie?: boolean };

type Pokazowe = {
  opis: string;
  umiejetnosc: string;
  polecenie: string;
  opcje: Record<Litera, string>;
  poprawna: Litera;
  reakcja: Record<Litera, string>;
  druga: string;
};

const KONIEC_POKAZU = "Dobrze, to wystarczy na pokaz. Przejdźmy dalej.";

// Własne zadania pokazowe (nie z arkuszy CKE): zamknięte, z typowymi pułapkami w dystraktorach.
const ZADANIA: Record<PrzedmiotId, Pokazowe> = {
  matematyka: {
    opis: "Matematyka · zadanie zamknięte",
    umiejetnosc: "działania na potęgach",
    polecenie: "Liczba $\\dfrac{2^{10}\\cdot 2^{-4}}{2^{3}}$ jest równa:",
    opcje: { A: "$2^{3}$", B: "$2^{9}$", C: "$2^{-3}$", D: "$2^{17}$" },
    poprawna: "A",
    reakcja: {
      A: "Zgadza się. Zanim pójdziemy dalej: dlaczego przy dzieleniu przez $2^{3}$ **odejmujesz** trójkę, a nie dzielisz wykładników?",
      B: "Blisko. Spójrz na ostatni krok: co dzieje się z wykładnikiem, gdy **dzielisz** przez $2^{3}$, a nie mnożysz?",
      C: "Skąd minus? Zacznij od licznika: jak zapiszesz $2^{10}\\cdot 2^{-4}$ jako jedną potęgę?",
      D: "Popatrz na znak przy czwórce w $2^{-4}$. Co robi minus w wykładniku, gdy mnożysz potęgi o tej samej podstawie?",
    },
    druga:
      "Właśnie tak: przy mnożeniu potęg o tej samej podstawie **dodajesz** wykładniki, przy dzieleniu **odejmujesz**: $$2^{10-4-3}=2^{3}$$ Tak pracujemy: ja pytam, ty dochodzisz do odpowiedzi.",
  },
  angielski: {
    opis: "Angielski · środki językowe · zadanie zamknięte",
    umiejetnosc: "czasy przeszłe (past perfect)",
    polecenie: "Choose the correct option: *By the time we arrived, the film ___.*",
    opcje: { A: "already started", B: "had already started", C: "has already started", D: "was already starting" },
    poprawna: "B",
    reakcja: {
      A: "Zastanów się nad *by the time*: co wydarzyło się **wcześniej**, wasz przyjazd czy początek filmu? Jak angielski pokazuje, że coś stało się przed inną przeszłą czynnością?",
      B: "Zgadza się. Co w zdaniu podpowiedziało ci, że potrzebny jest *past perfect*?",
      C: "*Has started* łączy przeszłość z teraźniejszością. A tu cała historia jest już w przeszłości: co to zmienia?",
      D: "*Past continuous* opisuje coś w trakcie. Czy film „był w trakcie zaczynania się”, czy zaczął się, zanim dotarliście?",
    },
    druga:
      "Dokładnie: *by the time* z czasem przeszłym to sygnał, że druga czynność skończyła się **wcześniej**, więc *past perfect*. Tak pracujemy: ja pytam, ty dochodzisz do odpowiedzi.",
  },
  polski: {
    opis: "Polski · środki stylistyczne · zadanie zamknięte",
    umiejetnosc: "rozpoznawanie środków stylistycznych",
    polecenie: "W wersie *„Litwo! Ojczyzno moja! ty jesteś jak zdrowie”* (A. Mickiewicz, „Pan Tadeusz”) zastosowano przede wszystkim:",
    opcje: { A: "apostrofę i porównanie", B: "metaforę i epitet", C: "anaforę i wyliczenie", D: "pytanie retoryczne i hiperbolę" },
    poprawna: "A",
    reakcja: {
      A: "Tak. Skąd wiesz, że to **porównanie**, a nie metafora?",
      B: "Metafora mówi, że coś **jest** czymś innym. A tu pada słowo „jak”: co ono zmienia?",
      C: "Anafora to powtórzenie na początku kolejnych wersów. Czy coś się tu powtarza? Spójrz raczej, **do kogo** mówi poeta.",
      D: "Czy w tym wersie pada jakieś pytanie? Zwróć uwagę na wykrzyknienia i na to, do kogo zwraca się podmiot.",
    },
    druga:
      "Właśnie: „jak” zamienia przenośnię w **porównanie**, a zwrot wprost do Litwy to **apostrofa**. Tak pracujemy: ja pytam, ty dochodzisz do odpowiedzi.",
  },
};

const KROKI = ["Cześć", "Przedmioty", "Pokaz", "Gdzie mnie spotkasz", "Start"];

export function Onboarding() {
  const session = useSession();
  const profil = useProfil();
  const ai = useAiReady(session ? session.user.id : null);
  const navigate = useNavigate();
  const [krok, setKrok] = useState(0);
  const [wybor, setWybor] = useState<MojPrzedmiot[] | null>(null);
  const [zapis, setZapis] = useState(false);

  if (session === false) return <Navigate to="/logowanie" replace />;
  if (!session || profil === undefined || ai === undefined) return null;

  const imie = profil?.display_name?.split(" ")[0];
  const przedmioty = wybor ?? profil?.subjects ?? [];

  async function zakoncz(dokad: string) {
    await markOnboarded();
    if (dokad === "/") resetTour();
    navigate(dokad);
  }

  async function zapiszPrzedmioty() {
    setZapis(true);
    const ok = await saveSubjects(przedmioty);
    setZapis(false);
    if (ok) setKrok(2);
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
              Zaczynamy
            </button>
          </section>
        )}

        {krok === 1 && (
          <section className={styles.step}>
            <TutorAvatar size={64} />
            <h1 className="h1">Co zdajesz na maturze?</h1>
            <p className="lead">Wybierz przedmioty i poziomy. Pulpit, arkusze i moje propozycje dopasują się do nich. Zmienisz je później w profilu.</p>
            <WyborPrzedmiotow value={przedmioty} onChange={setWybor} />
            <button type="button" className="btn btn-primary" disabled={!przedmioty.length || zapis} onClick={() => void zapiszPrzedmioty()}>
              Dalej
            </button>
          </section>
        )}

        {krok === 2 && przedmioty[0] && <Pokaz ai={ai} przedmioty={przedmioty} onDalej={() => setKrok(3)} />}

        {krok === 3 && (
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
            <button type="button" className="btn btn-primary" onClick={() => setKrok(4)}>
              Dalej
            </button>
          </section>
        )}

        {krok === 4 &&
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

function Pokaz({ ai, przedmioty, onDalej }: { ai: boolean; przedmioty: MojPrzedmiot[]; onDalej: () => void }) {
  const [ktory, setKtory] = useState<PrzedmiotId>(przedmioty[0]!.id);
  const zadanie = ZADANIA[ktory];
  const [wybor, setWybor] = useState<Litera | null>(null);
  const [wpisy, setWpisy] = useState<Wpis[]>([]);
  const [stan, setStan] = useState<AvatarState>("idle");
  const [szkic, setSzkic] = useState("");
  const listaRef = useRef<HTMLDivElement>(null);
  const tury = wpisy.filter((w) => w.od === "uczen").length;

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [wpisy]);

  function zmienPrzedmiot(id: PrzedmiotId) {
    if (stan === "thinking") return;
    setKtory(id);
    setWybor(null);
    setWpisy([]);
    setSzkic("");
  }

  const tekstZadania = () =>
    `${zadanie.opis}. ${zadanie.polecenie}\n${(Object.keys(zadanie.opcje) as Litera[]).map((l) => `${l}. ${zadanie.opcje[l]}`).join("\n")}\nPoprawna odpowiedź: ${zadanie.poprawna}.`;

  // Z AI odpowiada model; bez niego (albo gdy model zawiedzie) przygotowane zdanie, wyraźnie oznaczone.
  async function odpowiedz(historia: Wpis[], zapas: string) {
    setStan("thinking");
    if (ai) {
      let tekst = "";
      let pierwszy = true;
      try {
        await streamAi(
          {
            tier: "lekkie",
            task: "onboarding-pokaz",
            maxTokens: 1500,
            messages: rozmowa({ przedmiot: przedmiot(ktory)!.nazwa.toLowerCase(), umiejetnosc: zadanie.umiejetnosc, zadanie: tekstZadania() }, historia),
          },
          (d) => {
            tekst += d;
            const dodaj = pierwszy;
            pierwszy = false;
            setStan("talking");
            const widoczny = bezEmoji(tekst);
            setWpisy((w) => (dodaj ? [...w, { od: "tutor", tekst: widoczny }] : w.map((x, i) => (i === w.length - 1 ? { ...x, tekst: widoczny } : x))));
          },
        );
        if (tekst.trim()) {
          // Model potrafi zadać to samo pytanie po poprawnej odpowiedzi: wtedy zamiast powtórki pokazujemy przygotowane zdanie.
          if (powtarzaTutora(bezEmoji(tekst), historia)) {
            const zastepcza = powtarzaTutora(zapas, historia) ? KONIEC_POKAZU : zapas;
            setWpisy((w) => w.map((x, i) => (i === w.length - 1 ? { od: "tutor", tekst: zastepcza, powtorzenie: true } : x)));
          }
          return setStan("idle");
        }
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
    const historia: Wpis[] = [{ od: "uczen", tekst: `Wybieram ${l}: ${zadanie.opcje[l]}` }];
    setWpisy(historia);
    void odpowiedz(historia, zadanie.reakcja[l]);
  }

  function wyslij(e: FormEvent) {
    e.preventDefault();
    const tekst = szkic.trim();
    if (!tekst || stan === "thinking") return;
    setSzkic("");
    const historia: Wpis[] = [...wpisy, { od: "uczen", tekst }];
    setWpisy(historia);
    void odpowiedz(historia, zadanie.druga);
  }

  return (
    <section className={styles.step}>
      <span className="label">Pokaz · {ai ? "odpowiada AI z twojego konta" : "bez AI: odpowiedzi przygotowane"}</span>
      <h1 className="h1">Rozwiąż, a ja zareaguję</h1>

      {przedmioty.length > 1 && (
        <div className={styles.subjects} role="tablist" aria-label="Przedmiot pokazu">
          {przedmioty.map((m) => {
            const p = przedmiot(m.id)!;
            return (
              <button key={m.id} type="button" role="tab" aria-selected={ktory === m.id} className={`${styles.subjectTab} ${ktory === m.id ? styles.subjectOn : ""}`} onClick={() => zmienPrzedmiot(m.id)}>
                <SubjectIcon subject={p} size="sm" />
                {p.nazwa}
              </button>
            );
          })}
        </div>
      )}

      <div className={styles.task}>
        <p className="small muted">{zadanie.opis}</p>
        <Markdown className={styles.question}>{zadanie.polecenie}</Markdown>
        <div className={styles.options} role="radiogroup" aria-label="Odpowiedzi">
          {(Object.keys(zadanie.opcje) as Litera[]).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={wybor === l}
              // Po błędnym wyborze nie zdradzamy poprawnej: od tego jest Pestka.
              className={[styles.option, wybor === l ? (l === zadanie.poprawna ? styles.right : styles.wrong) : ""].join(" ")}
              onClick={() => wybierz(l)}
              disabled={!!wybor}
            >
              <span className={styles.letter}>{l}</span>
              <Markdown>{zadanie.opcje[l]}</Markdown>
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
                  <Markdown className={styles.tutorText}>{w.tekst}</Markdown>
                  {w.przygotowane && <p className={styles.note}>Odpowiedź przygotowana na pokaz. Po podpięciu AI odpowiem naprawdę.</p>}
                  {w.powtorzenie && <p className={styles.note}>Model powtórzył poprzednią odpowiedź, więc pokazuję przygotowaną.</p>}
                </div>
              </div>
            ) : (
              <p key={i} className={styles.studentText}>
                {w.tekst.replace(/\$/g, "")}
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
      {tury < 2 && (
        <button type="button" className={styles.later} onClick={onDalej}>
          Pomiń pokaz
        </button>
      )}
    </section>
  );
}
