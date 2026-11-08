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

const SVG = "http://www.w3.org/2000/svg";

// Podział kropli jak metaballe: koła w grupie rozmytej i przyciętej progiem alfy (filtr „goo”)
// zlewają się w jedną kroplę; gdy się rozsuwają, między nimi powstaje szyjka, która cienieje
// i pęka. Na kroplach cały czas są trzęsące się twarze z zaciśniętymi oczami, z miejsca
// pęknięcia pryskają kropelki, a druga kropla dojeżdża z lekkim odbiciem.
export function podzialKropli(r: DOMRect, rozjazd: number): Promise<void> {
  const R = r.width * 0.45;
  const s = r.width / 64; // skala rysunku avatara (viewBox 64)
  const W = Math.abs(rozjazd) + r.width * 5;
  const H = r.height * 4;
  const sx = r.left + r.width / 2 + rozjazd / 2;
  const sy = r.top + r.height * 0.55;
  const el = document.createElementNS(SVG, "svg");
  el.setAttribute("width", String(W));
  el.setAttribute("height", String(H));
  Object.assign(el.style, { position: "fixed", left: `${sx - W / 2}px`, top: `${sy - H / 2}px`, zIndex: "60", pointerEvents: "none", overflow: "visible" });
  const id = `goo-${Math.random().toString(36).slice(2, 8)}`;
  const twarz = `
      <path d="M${-11.4 * s} ${-1 * s} q ${3.4 * s} ${2 * s} ${6.8 * s} 0 M${4.6 * s} ${-1 * s} q ${3.4 * s} ${2 * s} ${6.8 * s} 0"
        fill="none" stroke="#0f151d" stroke-width="${2.4 * s}" stroke-linecap="round" />
      <path d="M${-5 * s} ${8.5 * s} c ${2.8 * s} ${2.6 * s} ${7.2 * s} ${2.6 * s} ${10 * s} 0"
        fill="none" stroke="#0f151d" stroke-width="${2.4 * s}" stroke-linecap="round" />
      <circle cx="${-15.5 * s}" cy="${6 * s}" r="${4 * s}" fill="#ffc8b7" opacity="0.7" />
      <circle cx="${15.5 * s}" cy="${6 * s}" r="${4 * s}" fill="#ffc8b7" opacity="0.7" />`;
  el.innerHTML = `
    <defs>
      <linearGradient id="${id}-c" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ff8a3d" /><stop offset="55%" stop-color="#ff7448" /><stop offset="100%" stop-color="#ff5e3a" />
      </linearGradient>
      <filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="${(R * 0.32).toFixed(1)}" />
        <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
      </filter>
    </defs>
    <g filter="url(#${id})" fill="url(#${id}-c)"><circle r="${R}" /><circle r="${R}" /></g>
    <g fill="url(#${id}-c)"></g>
    <g>${twarz}</g>
    <g opacity="0">${twarz}</g>`;
  const [cialo, rozprysk, twarzA, twarzB] = [...el.children].slice(1) as SVGGElement[];
  const [A, B] = [...cialo.children] as SVGCircleElement[];
  // Kropelki są poza filtrem: rozmyte małe kółka nie przechodzą progu i znikały.
  const krople = Array.from({ length: 10 }, (_, i) => {
    const c = document.createElementNS(SVG, "circle");
    rozprysk.appendChild(c);
    const kat = (i / 10) * Math.PI * 2 + Math.random() * 0.6;
    return { el: c, kat, v: R * (1.1 + Math.random() * 1.1), r: R * (0.1 + Math.random() * 0.1) };
  });

  const x0 = W / 2 - rozjazd / 2; // środek pierwszej kropli w układzie nakładki
  const y0 = H / 2;
  const CZAS = 480;
  const ROZPRYSK = 360; // ms lotu kropelek od pęknięcia
  // Najpierw powolne rozciąganie (szyjka), potem odskok z przestrzeleniem i odbiciem.
  const odbicie = (t: number) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
  const droga = (p: number) => (p < 0.42 ? 0.38 * (p / 0.42) ** 2 : 0.38 + 0.62 * odbicie((p - 0.42) / 0.58));
  const drzenie = (sila: number) => `${(Math.random() - 0.5) * sila}px`;
  const t0 = performance.now();
  let pekniecie: number | null = null;
  return new Promise((koniec) => {
    const krok = (t: number) => {
      const p = Math.min(1, (t - t0) / CZAS);
      const e = droga(p);
      const ax = x0 - rozjazd * 0.07 * Math.sin(Math.PI * Math.min(1, p * 1.4));
      const bx = x0 + rozjazd * e;
      A.setAttribute("cx", String(ax));
      A.setAttribute("cy", String(y0));
      A.setAttribute("r", String(R * (1 - 0.06 * Math.sin(Math.PI * p))));
      B.setAttribute("cx", String(bx));
      B.setAttribute("cy", String(y0));
      B.setAttribute("r", String(R * (0.72 + 0.28 * Math.min(1, e))));
      // Twarze trzęsą się przez cały podział i cichną na końcu; druga pojawia się, gdy kropla się wyłania.
      const sila = 2.6 * (p < 0.8 ? 1 : (1 - p) / 0.2);
      twarzA.setAttribute("transform", `translate(${ax} ${y0 - 2 * s})`);
      twarzA.style.translate = `${drzenie(sila)} ${drzenie(sila)}`;
      twarzB.setAttribute("transform", `translate(${bx} ${y0 - 2 * s}) scale(${0.72 + 0.28 * Math.min(1, e)})`);
      twarzB.style.translate = `${drzenie(sila)} ${drzenie(sila)}`;
      twarzB.setAttribute("opacity", String(Math.max(0, Math.min(1, (e - 0.45) / 0.25))));
      // Pęknięcie: krople dalej od siebie niż ok. 1,9 R.
      if (pekniecie === null && Math.abs(bx - ax) > R * 1.9) pekniecie = t;
      const po = pekniecie === null ? 0 : Math.min(1, (t - pekniecie) / ROZPRYSK);
      for (const k of krople) {
        if (!po) continue;
        const d = k.v * Math.sqrt(po);
        k.el.setAttribute("cx", String((ax + bx) / 2 + Math.cos(k.kat) * d));
        k.el.setAttribute("cy", String(y0 + Math.sin(k.kat) * d * 0.85 + po * po * R * 0.5));
        k.el.setAttribute("r", String(Math.max(0, k.r * (1 - po ** 2))));
      }
      if (p < 1 || po < 1) requestAnimationFrame(krok);
      else {
        el.remove();
        koniec();
      }
    };
    // Pierwsza klatka przed pokazaniem nakładki: bez tego koła przez moment stały w (0, 0),
    // czyli w lewym górnym rogu nakładki (widoczna „plamka”).
    krok(t0);
    document.body.appendChild(el);
  });
}

/** Miejsce spoczynku Pestki w rogu ekranu (jak restPoint w TutorGuide), dla avatara o boku `bok`. */
function miejsceSpoczynku(bok: number): { x: number; y: number } {
  const brzeg = window.innerWidth < 640 ? 16 : 24;
  return { x: window.innerWidth - bok - brzeg, y: window.innerHeight - bok - brzeg };
}

export type Rozklejenie = { doKarty: DOMRect; powrot: Promise<void> };

/** Zwraca miejsce drugiej Pestki (stamtąd leci do karty) i obietnicę powrotu pierwszej na spoczynek. */
export async function rozklejPestke(): Promise<Rozklejenie | null> {
  const avatar = document.querySelector<HTMLElement>("[data-pestka=przewodnik]");
  const svg = avatar?.querySelector("svg");
  if (!avatar || !svg) return null;
  const r = svg.getBoundingClientRect();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return { doKarty: r, powrot: Promise.resolve() };

  const przewodnik = avatar.parentElement as HTMLElement;
  przewodnik.style.opacity = "0";
  const a = kopia(svg, r);
  let b: HTMLElement | null = null;
  const sprzataj = () => {
    a.remove();
    b?.remove();
    przewodnik.style.opacity = "";
  };
  try {
    // 1. Krótkie, mocne drżenie z zaciśniętymi oczami; podział rusza od razu po nim.
    oczy(a, true);
    await a.animate(
      [
        { transform: "scale(1, 1) rotate(0deg)" },
        { transform: "scale(1.1, 0.9) rotate(-7deg)" },
        { transform: "scale(0.93, 1.08) rotate(6deg)" },
        { transform: "scale(1.12, 0.88) rotate(-5deg)" },
        { transform: "scale(1.06, 0.9) rotate(0deg)" },
      ],
      { duration: 200, easing: "ease-in-out" },
    ).finished;

    // 2. Podział kropli (szyjka, rozprysk, trzęsące się twarze). Druga kropla wychodzi
    //    w stronę środka ekranu, gdy z prawej nie ma miejsca.
    const kierunek = r.right + r.width * 1.3 > window.innerWidth - 8 ? -1 : 1;
    const rozjazd = kierunek * r.width * 1.25;
    a.style.opacity = "0";
    await podzialKropli(r, rozjazd);
    a.getAnimations().forEach((x) => x.cancel());
    a.style.opacity = "";
    b = kopia(svg, r);
    b.style.left = `${r.left + rozjazd}px`;
    oczy(a, false);
    oczy(b, false);
    // 3. Obie z otwartymi oczami jeszcze drżą, coraz słabiej, i stają na moment.
    const drgnij: Keyframe[] = [
      { transform: "translateX(0) rotate(0deg) scale(1.1, 0.9)" },
      { transform: "translateX(-2px) rotate(-5deg) scale(0.96, 1.04)" },
      { transform: "translateX(2px) rotate(3deg) scale(1.03, 0.98)" },
      { transform: "translateX(0) rotate(0deg) scale(1, 1)" },
    ];
    await Promise.all([a.animate(drgnij, { duration: 240, easing: "ease-out" }).finished, b.animate(drgnij, { duration: 240, easing: "ease-out", delay: 30 }).finished]);
    await czekaj(80);
  } catch (e) {
    sprzataj();
    throw e;
  }

  // 4. Druga oddaje miejsce lotowi do karty; pierwsza wraca na spoczynek skokiem: przysiada,
  //    leci prawie prosto (lekko rozciągnięta) i ląduje miękko z dwoma odbiciami, a dopiero
  //    wtedy w jej miejscu pojawia się prawdziwa Pestka.
  const doKarty = b.firstElementChild!.getBoundingClientRect();
  b.remove();
  const cel = miejsceSpoczynku(r.width);
  const dx = cel.x - r.left;
  const dy = cel.y - r.top;
  const luk = Math.min(28, Math.hypot(dx, dy) * 0.08);
  const lot = a.animate(
    [
      { transform: "translate(0, 0) scale(1, 1)", easing: "ease-out" },
      { transform: "translate(0, 2px) scale(1.14, 0.86)", offset: 0.12, easing: "cubic-bezier(0.5, 0, 0.6, 1)" },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - luk}px) scale(0.93, 1.07)`, offset: 0.42, easing: "cubic-bezier(0.3, 0, 0.3, 1)" },
      { transform: `translate(${dx}px, ${dy}px) scale(1.14, 0.86)`, offset: 0.74, easing: "ease-out" },
      { transform: `translate(${dx}px, ${dy}px) scale(0.96, 1.04)`, offset: 0.88, easing: "ease-in-out" },
      { transform: `translate(${dx}px, ${dy}px) scale(1, 1)` },
    ],
    { duration: 620, fill: "forwards" },
  );
  const powrot = lot.finished.then(
    () => czekaj(60).then(sprzataj),
    () => sprzataj(),
  );
  return { doKarty, powrot };
}
