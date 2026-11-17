// Motyw aplikacji idzie za ustawieniem systemu (tokens.css), chyba że uczeń wybrał go w Ustawieniach
// (atrybut data-motyw na <html>). Ten plik jest dla bibliotek, które muszą znać motyw w JS
// (Excalidraw, Monaco, Chart.js): nie czytają zmiennych CSS same.
import { useSyncExternalStore } from "react";

const zapytanie = "(prefers-color-scheme: dark)";

export const czyCiemny = () => {
  const wybrany = document.documentElement.dataset.motyw;
  return wybrany ? wybrany === "ciemny" : window.matchMedia(zapytanie).matches;
};

/** Wywołuje `fn` przy każdej zmianie motywu (systemu albo wyboru ucznia); zwraca funkcję odpinającą nasłuch. */
export function naZmianeMotywu(fn: (ciemny: boolean) => void) {
  const mq = window.matchMedia(zapytanie);
  const nasluch = () => fn(czyCiemny());
  mq.addEventListener("change", nasluch);
  const obserwator = new MutationObserver(nasluch);
  obserwator.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motyw"] });
  return () => {
    mq.removeEventListener("change", nasluch);
    obserwator.disconnect();
  };
}

// Stała funkcja: nowa przy każdym renderze odpinałaby i podpinała nasłuch od nowa.
const subskrybuj = (zmiana: () => void) => naZmianeMotywu(zmiana);

export const useCiemny = () => useSyncExternalStore(subskrybuj, czyCiemny);

/** „Mniej ruchu”: wybór z Ustawień (data-mniej-ruchu na <html>), a bez niego ustawienie systemu. */
export function mniejRuchu() {
  const wybor = document.documentElement.dataset.mniejRuchu;
  return wybor ? wybor === "tak" : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Kolor paska przeglądarki za wybranym motywem; bez wyboru zostają meta z index.html (za systemem).
const KOLOR_PASKA = { jasny: "#fff9f6", ciemny: "#10151c" };

function odswiezKolorPaska() {
  const wybrany = document.documentElement.dataset.motyw as keyof typeof KOLOR_PASKA | undefined;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = wybrany ? KOLOR_PASKA[wybrany] : (m.dataset.system ?? m.content);
  });
}

document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => (m.dataset.system = m.content));
new MutationObserver(odswiezKolorPaska).observe(document.documentElement, { attributes: true, attributeFilter: ["data-motyw"] });
odswiezKolorPaska();
