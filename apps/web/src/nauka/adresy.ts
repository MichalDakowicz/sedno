import type { Poziom } from "../arkusze/typy";
import type { FormatNauki } from "./api";

function adres(sciezka: string, poziom?: Poziom, skill?: string, format?: FormatNauki, repeatId?: string) {
  const params = new URLSearchParams();
  if (poziom) params.set("poziom", poziom);
  if (skill) params.set("umiejetnosc", skill);
  if (format && format !== "szybka-runda") params.set("format", format);
  if (repeatId) params.set("powtorz", repeatId);
  const query = params.toString();
  return query ? `${sciezka}?${query}` : sciezka;
}

export const adresNauki = (poziom?: Poziom, skill?: string) => adres("/nauka", poziom, skill);
export const adresMapy = (poziom?: Poziom, skill?: string) => adres("/umiejetnosci", poziom, skill);
/** Powtórki to sekcja „Do powtórki” w Nauce (angielski), dawniej osobna zakładka. */
export const adresPowtorek = (poziom?: Poziom) => {
  const nauka = adres("/nauka", poziom);
  return `${nauka}${nauka.includes("?") ? "&" : "?"}przedmiot=angielski#powtorki`;
};
export const adresStartu = (poziom: Poziom, skill: string, format?: FormatNauki, repeatId?: string) =>
  adres("/nauka/runda", poziom, skill, format, repeatId);
export const adresRundy = (id: string) => `/nauka/runda/${encodeURIComponent(id)}`;
export const adresRozbioru = (id: string) => `/nauka/rozbior/${encodeURIComponent(id)}`;
export const adresDiagnozy = (poziom?: Poziom) => adres("/nauka/diagnoza", poziom);
