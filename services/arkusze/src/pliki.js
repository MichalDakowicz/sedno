import { ascii, MIESIACE, terminMiesiaca } from "./sesje.js";

const PRZEDMIOT = {
  JA: "angielski", JAP: "angielski", JAA: "angielski", AD: "angielski",
  MA: "matematyka", MAP: "matematyka", IN: "informatyka", INP: "informatyka",
  PO: "polski", POP: "polski", BI: "biologia", BIP: "biologia",
  CH: "chemia", CHP: "chemia", FA: "fizyka", FAP: "fizyka",
  GE: "geografia", GEP: "geografia", HI: "historia", HIP: "historia",
  WO: "wos", WOP: "wos", FI: "filozofia", FIP: "filozofia", KL: "lacina", JLP: "lacina",
};
const POZIOM = { P: "podstawowy", R: "rozszerzony", D: "dwujezyczny" };

export function klasyfikuj(nazwa, strona, etykieta) {
  const opis = ascii(etykieta);
  const plik = ascii(nazwa).replace(/(\d{4})\s+(?=zasady)/g, "$1-").replace(/\s+/g, "");
  if (/karta odpowiedzi|transkrypcj|sciezka dla/.test(opis) || /[-_]karta|transkrypcj/.test(plik)) return null;
  const wynik = nowaNazwa(plik, strona) ?? staraNazwa(plik, strona) ?? dodatkowyPlik(plik, strona);
  if (!wynik) return null;
  // CKE opublikowała pokazową historię z marca 2022 pod nazwą z kodem 2305.
  const pokazowaHistoria = strona.termin === "probny" && strona.rok === 2022 && strona.miesiac === 3
    && /^mhip-r0-(?:100|660)-2305\.(?:pdf|docx)$/.test(plik);
  const rok = pokazowaHistoria ? strona.rok : wynik.rok ?? strona.rok;
  const miesiac = strona.termin === "probny" ? (strona.miesiac ?? wynik.miesiac) : (wynik.miesiac ?? strona.miesiac ?? 5);
  const termin = strona.termin ?? terminMiesiaca(rok, miesiac);
  const sesja = MIESIACE[(rok === 2020 && termin === "glowny" ? 6 : miesiac) - 1];
  return rok && termin && sesja ? { ...wynik, formula: strona.formula, rok, termin, sesja } : null;
}

function nowaNazwa(plik, { formula }) {
  const m = plik.match(/^([me])([a-z]{2,3})[-_]([prd])([012]?)(?:[-_]?[pr][12])?[-_]([^.]*)\.(pdf|docx|mp3)$/);
  if (!m || !PRZEDMIOT[m[2].toUpperCase()] || m[1] !== (formula === "2023" ? "m" : "e")) return null;
  const [, , kod, poziom, numer, opis, format] = m;
  const przedmiot = PRZEDMIOT[kod.toUpperCase()];
  const data = opis.match(/(?:^|[-_])(\d{2})(0[1-9]|1[0-2])(?=[-_]|$)/);
  if (!data) return null;
  const [, rok, miesiac] = data;
  const baza = { przedmiot, poziom: POZIOM[poziom.toUpperCase()], rok: 2000 + Number(rok), miesiac: Number(miesiac) };
  const czesc = (przedmiot === "polski" || przedmiot === "informatyka") && /^[12]$/.test(numer) ? Number(numer) : undefined;
  if (format === "mp3" && przedmiot === "angielski" && /^100-(?:z00-)?\d{4}(?:_|$)/.test(opis)) return { ...baza, typ: "nagranie" };
  if (format === "docx" && /^660(?:-a)?[-_]\d{4}(?:-arkusz)?$/.test(opis)) return { ...baza, typ: "tresc", czesc };
  if (format !== "pdf") return null;
  if (/^100(?:-a)?[-_]\d{4}(?:-arkusz)?$/.test(opis)) return { ...baza, typ: "arkusz", czesc };
  if (/^100[-_]\d{4}[-_](?:mapa|zalacznik)$/.test(opis)) return { ...baza, typ: "mapa" };
  if (/^(?:100[-_].*|\d{4})[-_]zasady(?:_oceniania)?$/.test(opis)) {
    const wspolny = /-[pr]1[-_]?[pr]2[-_]/.test(plik);
    return { ...baza, typ: "zasady", czesc: wspolny ? undefined : czesc };
  }
  return null;
}

function staraNazwa(plik, { formula }) {
  if (formula !== "2015") return null;
  const m = plik.match(/^m([a-z]{2})-([pr])([12pr])(?:[-_]1[pa])?((?:-\d{3}[np]?)?)(.*)\.(pdf|mp3)$/);
  if (!m) {
    const audio = plik.match(/^m(ja|ad)-1([pr])-\d{3}p?\.mp3$/);
    if (audio) return { przedmiot: "angielski", poziom: audio[1] === "ad" ? POZIOM.D : POZIOM[audio[2].toUpperCase()], typ: "nagranie" };
    return null;
  }
  const [, kod, poziom, numer, , koncowka, format] = m;
  const przedmiot = PRZEDMIOT[kod.toUpperCase()];
  if (!przedmiot) return null;
  const litera = /^[pr]$/.test(numer) ? numer : poziom;
  const baza = { przedmiot, poziom: kod === "ad" ? POZIOM.D : POZIOM[litera.toUpperCase()] };
  const czesc = przedmiot === "informatyka" ? Number(numer) || undefined : undefined;
  if (format === "mp3" && przedmiot === "angielski" && !koncowka) return { ...baza, typ: "nagranie" };
  if (format === "pdf" && /^(?:[-_](?:zasady(?:_oceniania)?|model|n))?$/.test(koncowka) &&
    (koncowka || !/[-_]1[pa]\b/.test(plik))) return { ...baza, typ: "zasady" };
  if (format === "pdf" && /[-_]1[pa]\b/.test(plik) && /^(?:-a)?$/.test(koncowka)) return { ...baza, typ: "arkusz", czesc };
  return null;
}

function dodatkowyPlik(plik, strona) {
  if (/^dane(?:_pr2?|[-_](?:(?:nf|sf)-)?\d{4})\.zip$/.test(plik)) {
    if (/^dane-nf/.test(plik) && strona.formula !== "2023" || /^dane-sf/.test(plik) && strona.formula !== "2015") return null;
    const data = plik.match(/(\d{2})(\d{2})\.zip$/);
    return { przedmiot: "informatyka", poziom: POZIOM.R, typ: "dane", ...(data && { rok: 2000 + Number(data[1]), miesiac: Number(data[2]) }) };
  }
  if (/^(?:a1barwny_zalacznik_pr|mapa(?:-100(?:-200-300-700|-\d{4}))?|zalacznik|mge-r1_1p-zalacznik_a1_a7)\.pdf$/.test(plik)) {
    return { przedmiot: "geografia", poziom: POZIOM.R, typ: "mapa" };
  }
  if (strona.rok !== 2014 || !strona.przedmiot || !/_(pp|pr|dj)[._]|^model_a1\.pdf$|^schemat_oceniania_matematykapp_/.test(plik)) return null;
  const poziom = plik.includes("_pp") || /^(?:model_a1|schemat_oceniania_matematykapp)/.test(plik) ? "P" : plik.includes("_dj") ? "D" : "R";
  const baza = { przedmiot: strona.przedmiot, poziom: POZIOM[poziom] };
  if (/^a1(?!a).+_arkusz\.pdf$/.test(plik)) return { ...baza, typ: "arkusz" };
  if (/^a1informatyka_pr_czesc_(i|ii)\.pdf$/.test(plik)) return { ...baza, typ: "arkusz", czesc: plik.endsWith("ii.pdf") ? 2 : 1 };
  if (/^a1[^_]+.*_nagrania\.mp3$/.test(plik)) return { ...baza, typ: "nagranie" };
  const czesc = plik.match(/^a1(?:a[23467])*informatyka_pr_czesc_(i|ii)_model_odpowiedzi\.pdf$/)?.[1];
  if (czesc) return { ...baza, typ: "zasady", czesc: czesc === "i" ? 1 : 2 };
  if (/^(?:(?:a1(?:a[23467])*)?|schemat_oceniania_)[^0-9]*.*(?:model_odpowiedzi|schemat_oceniania)|^model_a1\.pdf$|^schemat_oceniania_/.test(plik) &&
    !/^a[2-9]/.test(plik)) return { ...baza, typ: "zasady" };
  return null;
}
