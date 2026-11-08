// Rozklejenie Pestki przed omawianiem: w miejscu, gdzie siedzi, trzęsie się jak kropla wody,
// zamyka oczy i dzieli na dwie. Zwraca miejsce drugiej Pestki: stamtąd wylatuje ona do karty
// omawiania (OmowienieBledow), a pierwsza wraca na spoczynek (TutorGuide po dismiss).
// Cała sekwencja to kopie avatara nad stroną; prawdziwa Pestka jest na ten czas ukryta.

const czekaj = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

function kopia(zrodlo: Element, r: DOMRect): HTMLElement {
  const k = document.createElement("div");
  k.appendChild(zrodlo.cloneNode(true));
  Object.assign(k.style, {
    position: "fixed",
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    zIndex: "60",
    pointerEvents: "none",
    transformOrigin: "50% 90%",
  });
  document.body.appendChild(k);
  return k;
}

// Oczy to dwie elipsy w avatarze (TutorAvatar); mrugnięcie z CSS wyłączamy, póki są zamknięte.
function oczy(k: HTMLElement, zamkniete: boolean) {
  k.querySelectorAll<SVGElement>('ellipse[cy="30"]').forEach((o) => {
    o.style.animation = zamkniete ? "none" : "";
    o.style.transition = "transform 0.16s ease";
    o.style.transform = zamkniete ? "scaleY(0.12)" : "";
  });
}

export async function rozklejPestke(): Promise<DOMRect | null> {
  const avatar = document.querySelector<HTMLElement>("[data-pestka=przewodnik]");
  const svg = avatar?.querySelector("svg");
  if (!avatar || !svg) return null;
  const r = svg.getBoundingClientRect();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return r;

  const przewodnik = avatar.parentElement as HTMLElement;
  przewodnik.style.opacity = "0";
  const a = kopia(svg, r);
  let b: HTMLElement | null = null;
  try {
    // 1. Kropla: drży i faluje, coraz mocniej.
    await a.animate(
      [
        { transform: "scale(1, 1) rotate(0deg)" },
        { transform: "scale(1.08, 0.92) rotate(-6deg)" },
        { transform: "scale(0.94, 1.07) rotate(5deg)" },
        { transform: "scale(1.12, 0.88) rotate(-7deg)" },
        { transform: "scale(0.92, 1.1) rotate(6deg)" },
        { transform: "scale(1.14, 0.86) rotate(-3deg)" },
        { transform: "scale(1, 1) rotate(0deg)" },
      ],
      { duration: 520, easing: "ease-in-out" },
    ).finished;

    // 2. Skupienie: zamyka oczy i przysiada.
    oczy(a, true);
    await a.animate([{ transform: "scale(1, 1)" }, { transform: "scale(1.06, 0.9)" }], { duration: 220, easing: "ease-out", fill: "forwards" }).finished;

    // 3. Podział: rozciąga się na bok i odpączkowuje z niej druga kropla; pierwsza zostaje
    //    na miejscu (to prawdziwa Pestka), druga odjeżdża w bok.
    b = kopia(svg, r);
    oczy(b, true);
    // Druga kropla wychodzi w stronę środka ekranu, gdy z prawej nie ma miejsca.
    const kierunek = r.right + r.width * 0.9 > window.innerWidth - 8 ? -1 : 1;
    const rozjazd = kierunek * Math.max(26, r.width * 0.75);
    const opcje = { duration: 380, easing: "cubic-bezier(0.3, 1.3, 0.5, 1)", fill: "forwards" as const };
    await Promise.all([
      a.animate(
        [{ transform: "scale(1.06, 0.9)" }, { transform: `translateX(${-3 * kierunek}px) scale(1.22, 0.86)`, offset: 0.35 }, { transform: "scale(1, 1)" }],
        opcje,
      ).finished,
      b.animate(
        [
          { transform: "translateX(0) scale(1.06, 0.9)" },
          { transform: `translateX(${rozjazd * 0.35}px) scale(1.18, 0.8)`, offset: 0.35 },
          { transform: `translateX(${rozjazd * 0.8}px) scale(0.88, 1.1)`, offset: 0.7 },
          { transform: `translateX(${rozjazd}px) scale(1, 1)` },
        ],
        opcje,
      ).finished,
    ]);
    oczy(a, false);
    oczy(b, false);
    await czekaj(180);

    // 4. Druga kropla oddaje swoje miejsce lotowi do karty, pierwsza staje się z powrotem Pestką.
    return b.firstElementChild!.getBoundingClientRect();
  } finally {
    a.remove();
    b?.remove();
    przewodnik.style.opacity = "";
  }
}
