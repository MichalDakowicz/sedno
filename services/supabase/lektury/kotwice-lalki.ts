// Identyfikatory nagłówków Wolnych Lektur, w kolejności rozdziałów każdego tomu.
const KOTWICE: Record<string, readonly number[]> = {
  I: [4, 53, 133, 278, 469, 565, 792, 905, 1186, 1658, 2141, 2492, 2767, 3101, 3243, 3300, 3417, 3685, 4075, 4563],
  II: [4, 387, 721, 1104, 1207, 1544, 1810, 2199, 2417, 2849, 3205, 3442, 3864, 4032, 4268, 4420, 5343, 5373],
};

export function kotwicaLalki(miejsce: string): string | undefined {
  const rozdzial = /^t\. (I|II), rozdz\. (\d+)(?:,|$)/.exec(miejsce);
  if (!rozdzial) return;
  const [, tom, nr] = rozdzial;
  const id = KOTWICE[tom][Number(nr) - 1];
  if (id) return "https://wolnelektury.pl/katalog/lektura/lalka-tom-" + (tom === "I" ? "pierwszy" : "drugi") + ".html#wl-e" + id;
}
