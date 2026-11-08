// Wspólne tokeny dla web i mobile (Expo). Wartości liczbowe w px, żeby działały w React Native.
// Kierunek wizualny: ciepłe kremowe tło, jeden pomarańczowy akcent, duża lekka typografia.

export const color = {
  background: "#fff9f6",
  surface: "#ffffff",
  foreground: "#0f151d",
  muted: "#59616b",
  subtle: "#69707a",
  line: "#ece4df",
  grid: "rgba(15, 21, 29, 0.045)",
  primary: "#ff7448",
  primaryHover: "#f2643a",
  primaryText: "#c2410c",
  primaryForeground: "#0f151d",
  primarySoft: "#ffe6dc",
  secondary: "#d3e1ff",
  secondaryForeground: "#1b2a4a",
  success: "#1f9d63",
  successStrong: "#17804f",
  danger: "#e40014",
  dark: "#1b232e",
} as const;

// Kolory przedmiotów: tło ikony i sama ikona.
export const tone = {
  orange: { bg: "#ffe6dc", fg: "#d94a1f" },
  blue: { bg: "#d3e1ff", fg: "#2f55b4" },
  yellow: { bg: "#fdf0c4", fg: "#8a5a00" },
} as const;

export const gradient = {
  accent: ["#ff5e3a", "#ff8a3d", "#ff6f52"],
} as const;

export const radius = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
  9: 96,
} as const;

// Hierarchię budujemy rozmiarem i kolorem, nie grubością: nagłówki są w wadze 400 z ciasnym trackingiem.
export const type = {
  family: "Inter",
  display: { size: 56, line: 1.02, tracking: -0.05, weight: 400 },
  h1: { size: 40, line: 1.08, tracking: -0.04, weight: 400 },
  h2: { size: 28, line: 1.15, tracking: -0.03, weight: 400 },
  h3: { size: 20, line: 1.3, tracking: -0.015, weight: 500 },
  body: { size: 16, line: 1.5, tracking: 0, weight: 400 },
  lead: { size: 19, line: 1.65, tracking: 0, weight: 400 },
  small: { size: 14, line: 1.45, tracking: 0, weight: 400 },
  label: { size: 12, line: 1.3, tracking: 0.08, weight: 600 },
} as const;

export const shadow = {
  float: "0 8px 32px rgba(15, 21, 29, 0.08)",
} as const;
