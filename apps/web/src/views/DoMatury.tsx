import { Link } from "react-router-dom";
import { useProfil } from "../auth";
import { CELE, useUczenie } from "../konto/profilUcznia";
import { przedmiot, zgrupuj } from "../konto/przedmioty";
import { dniDo, egzaminyUcznia, minal, najblizszy, nazwaEgzaminu, odmianaDni, opisDaty } from "../konto/terminy";
import s from "./DoMatury.module.css";
import { NaglowekStrony } from "../components/NaglowekStrony";

export function DoMatury() {
  const profil = useProfil();
  const u = useUczenie();
  const moje = profil?.subjects ?? [];
  const egzaminy = egzaminyUcznia(moje);
  const pierwszy = najblizszy(egzaminy);
  const przedmioty = zgrupuj(moje);

  return (
    <main className={`container ${s.strona}`}>
      <NaglowekStrony etykieta="Matura 2027" tytul="Do matury" lead="Ile czasu zostało do twoich egzaminów i jaki masz cel." />

      <section className={s.sekcja} aria-labelledby="odliczanie">
        <h2 id="odliczanie" className="h2">
          Odliczanie
        </h2>
        {!egzaminy.length ? (
          <>
            <p className="muted">Nie ma jeszcze wybranych przedmiotów, więc nie wiem, do którego egzaminu liczyć.</p>
            <Link to="/profil#przedmioty" className="link" style={{ justifySelf: "start" }}>
              Wybierz przedmioty
            </Link>
          </>
        ) : (
          <>
            <div className={s.pierwszy}>
              {pierwszy ? (
                <>
                  <span className="label">Pierwszy egzamin</span>
                  <span className={s.liczba}>
                    {dniDo(pierwszy.data)} <span>{odmianaDni(dniDo(pierwszy.data))}</span>
                  </span>
                  <span className="muted small">
                    {pierwszy.znana
                      ? `${nazwaEgzaminu(pierwszy)}, ${opisDaty(pierwszy.data)} (do weryfikacji)`
                      : `${nazwaEgzaminu(pierwszy)}, początek sesji majowej 2027. Dokładne daty egzaminów poda harmonogram CKE.`}
                  </span>
                </>
              ) : (
                <p className="muted">Wszystkie egzaminy za tobą.</p>
              )}
            </div>
            <ul className="wiersze">
              {egzaminy.map((e) => (
                <li key={`${e.przedmiotId}-${e.poziom}`} className="wiersz">
                  <span className="wiersz-tresc">
                    <span className="h3">{nazwaEgzaminu(e)}</span>
                    <span className="wiersz-opis">{e.znana ? opisDaty(e.data) : "data wg harmonogramu CKE"}</span>
                  </span>
                  {minal(e) ? (
                    <span className="wiersz-wartosc muted">po egzaminie</span>
                  ) : (
                    <span className={`wiersz-wartosc ${s.dni}`}>
                      {dniDo(e.data)} {odmianaDni(dniDo(e.data))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className={`muted small ${s.przypis}`}>
              Terminy z komunikatu CKE z 20 sierpnia 2026, do weryfikacji w BIP CKE.
            </p>
          </>
        )}
      </section>

      {przedmioty.length > 0 && (
        <section className={s.sekcja} aria-labelledby="cel">
          <h2 id="cel" className="h2">
            Cel z profilu
          </h2>
          <ul className="wiersze">
            {przedmioty.map((m) => {
              const cel = CELE.find((c) => c.id === u.cele?.[m.id]);
              return (
                <li key={m.id} className="wiersz">
                  <span className="wiersz-tresc h3">{przedmiot(m.id)!.nazwa}</span>
                  {cel ? (
                    <span className={`wiersz-wartosc ${s.cel}`}>{cel.nazwa}</span>
                  ) : (
                    <span className="wiersz-wartosc">
                      <Link to="/profil-ucznia" className="link" style={{ justifySelf: "start" }}>
                        Ustaw cel w profilu
                      </Link>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
