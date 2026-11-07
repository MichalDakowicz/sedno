// Rozpoznaje pliki CKE po nazwie: język angielski (wszystkie poziomy)
// i matematyka na poziomie podstawowym (formuła 2023).
//
// Matematyka: MMAP-P0-100-2305.pdf (2023), od 2024 MMAP-P0-100-A-2405-arkusz.pdf
// i MMAP-P0-100-2405-zasady.pdf. Z dwóch wersji arkusza bierzemy wersję A.
//
// Nazewnictwo angielskiego zmieniało się między latami:
//   formuła 2023:        MJAP-P0-100-A-2505-arkusz.pdf, MJAP-P0-100-…-2505-zasady.pdf
//   formuła 2015 od 2021: EJAP-P0-100-2105.pdf, EJAP-P0-100-2105-zasady.pdf
//   formuła 2015 do 2020: MJA-P1_1P-192.pdf, MJA-P1-192-zasady_oceniania.pdf,
//                         dwujęzyczny MAD-R1_1A-192.pdf, w latach 2015–2017 klucz
//                         MJA-PP-162n_zasady_oceniania.pdf
// Bierzemy tylko podstawową formę arkusza (100 / _1P / _1A), bez dostosowań.

const POZIOM = { P: "podstawowy", R: "rozszerzony", D: "dwujezyczny" };

export function klasyfikuj(nazwa) {
  const k = matematyka(nazwa) ?? angielski(nazwa);
  return k && { przedmiot: "angielski", ...k };
}

function matematyka(nazwa) {
  let m;
  if ((m = nazwa.match(/^MMAP-P0-100(?:-A)?-(\d{2})(\d{2})(?:-arkusz)?\.pdf$/))) {
    return { typ: "arkusz", przedmiot: "matematyka", formula: "2023", poziom: POZIOM.P, rok: 2000 + Number(m[1]), miesiac: m[2] };
  }
  if ((m = nazwa.match(/^MMAP-P0-100-(\d{2})\d{2}-zasady\.pdf$/))) {
    return { typ: "zasady", przedmiot: "matematyka", formula: "2023", poziom: POZIOM.P, rok: 2000 + Number(m[1]) };
  }
  return null;
}

function angielski(nazwa) {
  let m;

  // Formuła 2023 (MJAP/MJAA) i formuła 2015 w nowym nazewnictwie (EJAP/EJAA).
  if ((m = nazwa.match(/^([ME])JA[PA]-([PRD])0-100(?:-A)?-(\d{2})(\d{2})(?:-arkusz)?\.pdf$/))) {
    return { typ: "arkusz", formula: m[1] === "M" ? "2023" : "2015", poziom: POZIOM[m[2]], rok: 2000 + Number(m[3]), miesiac: m[4] };
  }
  if ((m = nazwa.match(/^([ME])JA[PA]-([PRD])0-100[-\w]*?-(\d{2})(\d{2})(?:_[-\w]+)?-zasady\.pdf$/))) {
    return { typ: "zasady", formula: m[1] === "M" ? "2023" : "2015", poziom: POZIOM[m[2]], rok: 2000 + Number(m[3]) };
  }
  if ((m = nazwa.match(/^EJA[PA]-([PRD])0-100-(\d{2})\d{2}\.mp3$/))) {
    return { typ: "nagranie", formula: "2015", poziom: POZIOM[m[1]], rok: 2000 + Number(m[2]) };
  }
  // Nagrania formuły 2023 nie mają roku w stałym miejscu; rok bierzemy ze strony.
  if ((m = nazwa.match(/^MJA[PA]?-([PRD])0?-100[-\w]*\.mp3$/))) {
    return { typ: "nagranie", formula: "2023", poziom: POZIOM[m[1]] };
  }

  // Formuła 2015, nazewnictwo z lat 2015–2020. Ostatnia cyfra kodu sesji
  // to termin (2 = maj), dwie pierwsze to rok.
  if ((m = nazwa.match(/^(MJA|MAD)-([PR])1_1[PA]-(\d{2})2(?:-A)?\.pdf$/))) {
    return { typ: "arkusz", formula: "2015", poziom: m[1] === "MAD" ? POZIOM.D : POZIOM[m[2]], rok: 2000 + Number(m[3]), miesiac: "05" };
  }
  // Klucz: MJA-P1-…, w latach 2015–2017 MJA-PP-… (podstawowy) i MJA-PR-… (rozszerzony).
  if ((m = nazwa.match(/^(MJA|MAD)-(P1|R1|PP|PR)-(\d{2})2n?(?:[-_]zasady(?:_oceniania)?)?\.pdf$/))) {
    const poziom = m[1] === "MAD" ? POZIOM.D : m[2] === "P1" || m[2] === "PP" ? POZIOM.P : POZIOM.R;
    return { typ: "zasady", formula: "2015", poziom, rok: 2000 + Number(m[3]) };
  }
  if ((m = nazwa.match(/^(MJA|MAD)-(P1|R1|1P|1R)-(\d{2})2\.mp3$/))) {
    return { typ: "nagranie", formula: "2015", poziom: m[1] === "MAD" ? POZIOM.D : m[2].includes("P") ? POZIOM.P : POZIOM.R, rok: 2000 + Number(m[3]) };
  }
  return null;
}
