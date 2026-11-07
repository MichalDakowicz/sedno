// Równania Office (OMML) z arkusza DOCX na LaTeX dla KaTeX.
// Obsługujemy konstrukcje spotykane w arkuszach CKE z matematyki: ułamki,
// potęgi i indeksy, pierwiastki, nawiasy, funkcje, układy (klamra), akcenty.
// Nieznany element zamieniamy na treść jego dzieci, żeby nie zgubić tekstu.

const ZNAKI = {
  "−": "-",
  "–": "-",
  "≥": "\\geq ",
  "≤": "\\leq ",
  "≠": "\\neq ",
  "≈": "\\approx ",
  "∈": "\\in ",
  "∉": "\\notin ",
  "∞": "\\infty ",
  "⋅": "\\cdot ",
  "·": "\\cdot ",
  "×": "\\times ",
  "÷": "\\div ",
  "±": "\\pm ",
  "°": "^{\\circ}",
  "∡": "\\measuredangle ",
  "∢": "\\sphericalangle ",
  "∪": "\\cup ",
  "∩": "\\cap ",
  "⊂": "\\subset ",
  "∅": "\\emptyset ",
  "√": "\\surd ",
  "→": "\\to ",
  "⇒": "\\Rightarrow ",
  "⇔": "\\Leftrightarrow ",
  "∘": "\\circ ",
  "…": "\\ldots ",
  "⊥": "\\perp ",
  "∥": "\\parallel ",
  "△": "\\triangle ",
  "ℝ": "\\mathbb{R}",
  "ℕ": "\\mathbb{N}",
  "ℤ": "\\mathbb{Z}",
  "{": "\\{",
  "}": "\\}",
  "%": "\\%",
  "#": "\\#",
  "$": "\\$",
  _: "\\_",
  "^": "\\hat{}",
  "~": "\\sim ",
  "\\": "\\backslash ",
};
const GRECKIE = "αβγδεζηθικλμνξπρστυφχψωΓΔΘΛΞΠΣΦΨΩ";
const NAZWY_GRECKIE = "alpha beta gamma delta varepsilon zeta eta theta iota kappa lambda mu nu xi pi rho sigma tau upsilon varphi chi psi omega Gamma Delta Theta Lambda Xi Pi Sigma Phi Psi Omega".split(" ");
for (const [i, z] of [...GRECKIE].entries()) ZNAKI[z] = `\\${NAZWY_GRECKIE[i]} `;

const FUNKCJE = { sin: "\\sin", cos: "\\cos", tg: "\\operatorname{tg}", ctg: "\\operatorname{ctg}", log: "\\log", ln: "\\ln", lim: "\\lim", max: "\\max", min: "\\min" };
const NAWIASY = { "(": "(", ")": ")", "[": "[", "]": "]", "{": "\\{", "}": "\\}", "|": "|", "‖": "\\|", "⟨": "\\langle", "⟩": "\\rangle", "⌊": "\\lfloor", "⌋": "\\rfloor", "⌈": "\\lceil", "⌉": "\\rceil", "": "." };
const AKCENTY = { "→": "\\vec", "⃗": "\\vec", "̂": "\\hat", "^": "\\hat", "̅": "\\overline", "¯": "\\overline", "̃": "\\tilde", "~": "\\tilde", "̇": "\\dot" };
const NARY = { "∑": "\\sum", "∏": "\\prod", "∫": "\\int", "⋃": "\\bigcup", "⋂": "\\bigcap" };

const dzieci = (n) => {
  const w = [];
  for (let c = n?.firstChild; c; c = c.nextSibling) if (c.nodeType === 1) w.push(c);
  return w;
};
const dziecko = (n, nazwa) => dzieci(n).find((c) => c.nodeName === nazwa);
const wartosc = (n, sciezka) => {
  let x = n;
  for (const s of sciezka) x = x && dziecko(x, s);
  return x?.getAttribute("m:val") ?? null;
};

export function ommlNaLatex(n) {
  return wyczysc(wezel(n, {}));
}

function wyczysc(tex) {
  return tex
    // Przecinek dziesiętny („2,25”) bez odstępu po nim. Ze spacją („1, 3”) to współrzędne.
    .replace(/(\d),(?=\d)/g, "$1{,}")
    .replace(/\s+/g, " ")
    .trim();
}

function lista(n, ctx) {
  return dzieci(n)
    .map((c) => wezel(c, ctx))
    .join("");
}

const grupa = (n, ctx) => `{${n ? lista(n, ctx) : ""}}`;

function wezel(n, ctx) {
  switch (n.nodeName) {
    case "m:oMathPara":
    case "m:oMath":
    case "m:e":
    case "m:num":
    case "m:den":
    case "m:sup":
    case "m:sub":
    case "m:deg":
    case "m:fName":
    case "m:lim":
      return lista(n, ctx);
    case "m:r":
      return run(n, ctx);
    case "m:f": {
      const typ = wartosc(n, ["m:fPr", "m:type"]);
      const licz = grupa(dziecko(n, "m:num"), ctx);
      const mian = grupa(dziecko(n, "m:den"), ctx);
      if (typ === "lin") return `${licz}/${mian}`;
      if (typ === "noBar") return `\\genfrac{}{}{0pt}{}${licz}${mian}`;
      return `\\frac${licz}${mian}`;
    }
    case "m:sSup":
      return `${grupa(dziecko(n, "m:e"), ctx)}^${grupa(dziecko(n, "m:sup"), ctx)}`;
    case "m:sSub":
      return `${grupa(dziecko(n, "m:e"), ctx)}_${grupa(dziecko(n, "m:sub"), ctx)}`;
    case "m:sSubSup":
      return `${grupa(dziecko(n, "m:e"), ctx)}_${grupa(dziecko(n, "m:sub"), ctx)}^${grupa(dziecko(n, "m:sup"), ctx)}`;
    case "m:sPre":
      return `{}_${grupa(dziecko(n, "m:sub"), ctx)}^${grupa(dziecko(n, "m:sup"), ctx)}${grupa(dziecko(n, "m:e"), ctx)}`;
    case "m:rad": {
      const ukryty = ["1", "on", "true"].includes(wartosc(n, ["m:radPr", "m:degHide"]) ?? "");
      const st = dziecko(n, "m:deg");
      const stopien = st ? lista(st, ctx).trim() : "";
      return ukryty || !stopien ? `\\sqrt${grupa(dziecko(n, "m:e"), ctx)}` : `\\sqrt[${stopien}]${grupa(dziecko(n, "m:e"), ctx)}`;
    }
    case "m:d": {
      const pr = dziecko(n, "m:dPr");
      const beg = pr && dziecko(pr, "m:begChr") ? (wartosc(pr, ["m:begChr"]) ?? "") : "(";
      const end = pr && dziecko(pr, "m:endChr") ? (wartosc(pr, ["m:endChr"]) ?? "") : ")";
      const sep = pr && dziecko(pr, "m:sepChr") ? (wartosc(pr, ["m:sepChr"]) ?? "") : "|";
      const elementy = dzieci(n).filter((c) => c.nodeName === "m:e");
      // Klamra otwierająca bez zamykającej z układem w środku: układ równań / funkcja przedziałami.
      const srodek = elementy.map((e) => lista(e, ctx)).join(sep === "|" ? "\\mid " : (ZNAKI[sep] ?? sep));
      return `\\left${NAWIASY[beg] ?? beg}${srodek}\\right${NAWIASY[end] ?? end}`;
    }
    case "m:eqArr": {
      const wiersze = dzieci(n)
        .filter((c) => c.nodeName === "m:e")
        .map((e) => lista(e, { ...ctx, wUkladzie: true }));
      const wyrownanie = wiersze.some((w) => w.includes("&"));
      return wyrownanie ? `\\begin{aligned}${wiersze.join("\\\\")}\\end{aligned}` : `\\begin{array}{l}${wiersze.join("\\\\")}\\end{array}`;
    }
    case "m:m": {
      // Macierz w arkuszach to zwykle funkcja przedziałami albo układ w klamrze:
      // kolumny wyrównane do lewej czytają się lepiej niż wyśrodkowane.
      const wiersze = dzieci(n)
        .filter((c) => c.nodeName === "m:mr")
        .map((r) => dzieci(r).filter((c) => c.nodeName === "m:e").map((e) => lista(e, ctx)));
      const kolumn = Math.max(1, ...wiersze.map((w) => w.length));
      return `\\begin{array}{${"l".repeat(kolumn)}}${wiersze.map((w) => w.join("&")).join("\\\\")}\\end{array}`;
    }
    case "m:func": {
      const nazwa = dziecko(n, "m:fName");
      return `${nazwa ? lista(nazwa, { ...ctx, funkcja: true }) : ""}${grupa(dziecko(n, "m:e"), ctx)}`;
    }
    case "m:acc": {
      const znak = wartosc(n, ["m:accPr", "m:chr"]) ?? "̂";
      return `${AKCENTY[znak] ?? "\\hat"}${grupa(dziecko(n, "m:e"), ctx)}`;
    }
    case "m:bar":
      return `${wartosc(n, ["m:barPr", "m:pos"]) === "bot" ? "\\underline" : "\\overline"}${grupa(dziecko(n, "m:e"), ctx)}`;
    case "m:groupChr": {
      const gora = wartosc(n, ["m:groupChrPr", "m:pos"]) === "top";
      return `${gora ? "\\overbrace" : "\\underbrace"}${grupa(dziecko(n, "m:e"), ctx)}`;
    }
    case "m:limLow":
      return `\\underset${grupa(dziecko(n, "m:lim"), ctx)}${grupa(dziecko(n, "m:e"), ctx)}`;
    case "m:limUpp":
      return `\\overset${grupa(dziecko(n, "m:lim"), ctx)}${grupa(dziecko(n, "m:e"), ctx)}`;
    case "m:nary": {
      const znak = wartosc(n, ["m:naryPr", "m:chr"]) ?? "∫";
      const pod = dziecko(n, "m:sub");
      const nad = dziecko(n, "m:sup");
      return `${NARY[znak] ?? ZNAKI[znak] ?? znak}${pod && dzieci(pod).length ? `_${grupa(pod, ctx)}` : ""}${nad && dzieci(nad).length ? `^${grupa(nad, ctx)}` : ""}${grupa(dziecko(n, "m:e"), ctx)}`;
    }
    case "m:box":
    case "m:borderBox":
    case "m:phant":
      return grupa(dziecko(n, "m:e"), ctx);
    default:
      // Właściwości (m:*Pr, m:ctrlPr) i wtrącenia Worda (w:rPr, zakładki) pomijamy.
      if (/Pr$/.test(n.nodeName) || n.nodeName.startsWith("w:")) return "";
      return lista(n, ctx);
  }
}

function run(n, ctx) {
  const t = dzieci(n)
    .filter((c) => c.nodeName === "m:t")
    .map((c) => c.textContent)
    .join("");
  if (!t) return "";
  const pr = dziecko(n, "m:rPr");
  // Arkusze CKE oznaczają w Wordzie także zmienne stylem „plain”, a na maturze
  // są kursywą, więc styl ignorujemy; prostym pismem idą tylko funkcje i słowa.
  const tekstowy = pr && dziecko(pr, "m:nor");
  const skrypt = pr && wartosc(pr, ["m:scr"]);
  const czysty = t.trim();

  if (FUNKCJE[czysty]) return `${FUNKCJE[czysty]} `;
  // Słowa w równaniu („dla”, „oraz”) to tekst z odstępami. Wielkie litery
  // („ABC”) to nazwy punktów, więc zostają literami w trybie matematycznym.
  const slowo = /^[\p{Ll}\s]+$/u.test(t) && /\p{Ll}{2,}/u.test(t);
  if (tekstowy || slowo) return czysty ? `\\ \\text{${czysty.replace(/[{}\\]/g, "")}}\\ ` : "";
  if (ctx.funkcja && /^\p{L}+$/u.test(czysty)) return `\\operatorname{${czysty}}`;

  let wynik = "";
  for (const z of t) {
    if (z === "&" && ctx.wUkladzie) wynik += "&";
    else if (z === "&") wynik += "\\&";
    else if (/[   ]/.test(z)) wynik += "\\,";
    else wynik += ZNAKI[z] ?? z;
  }
  if (skrypt === "double-struck") return `\\mathbb{${wynik}}`;
  return wynik;
}
