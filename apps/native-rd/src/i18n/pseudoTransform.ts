/**
 * Pure pseudo-locale transform.
 *
 * Kept separate from scripts/generate-pseudo-locale.ts so unit tests can
 * import this module without dragging node:fs / import.meta through the
 * babel-preset-expo pipeline (which rejects import.meta for Hermes targets).
 *
 * See the script for usage context. Interpolation tokens ({{name}}) and
 * i18next plural suffix keys (_zero, _one, _other) are preserved verbatim —
 * they're structural, not display copy.
 */

const ACCENT_MAP: Record<string, string> = {
  a: "à",
  b: "ƀ",
  c: "ç",
  d: "đ",
  e: "ê",
  f: "ƒ",
  g: "ğ",
  h: "ĥ",
  i: "ï",
  j: "ĵ",
  k: "ķ",
  l: "ĺ",
  m: "ɱ",
  n: "ñ",
  o: "ø",
  p: "þ",
  q: "ǫ",
  r: "ŕ",
  s: "š",
  t: "ţ",
  u: "ü",
  v: "ṽ",
  w: "ŵ",
  x: "ẋ",
  y: "ý",
  z: "ž",
  A: "À",
  B: "Ɓ",
  C: "Ç",
  D: "Đ",
  E: "Ê",
  F: "Ƒ",
  G: "Ğ",
  H: "Ĥ",
  I: "Ï",
  J: "Ĵ",
  K: "Ķ",
  L: "Ĺ",
  M: "Ɱ",
  N: "Ñ",
  O: "Ø",
  P: "Þ",
  Q: "Ǫ",
  R: "Ŕ",
  S: "Š",
  T: "Ţ",
  U: "Ü",
  V: "Ṽ",
  W: "Ŵ",
  X: "Ẋ",
  Y: "Ý",
  Z: "Ž",
};

const PADDING_RATIO = 0.4;
const SPLIT_TOKEN = /(\{\{[^}]+\}\})/g;
const IS_TOKEN = /^\{\{[^}]+\}\}$/;

export function pseudoize(value: string): string {
  if (value.length === 0) return value;

  const accented = value
    .split(SPLIT_TOKEN)
    .map((segment) =>
      IS_TOKEN.test(segment)
        ? segment
        : [...segment].map((char) => ACCENT_MAP[char] ?? char).join(""),
    )
    .join("");

  const padCount = Math.max(1, Math.round(value.length * PADDING_RATIO));
  const padding = "·".repeat(padCount);
  return `[${accented}${padding}]`;
}

export type TranslationTree =
  | string
  | TranslationTree[]
  | { [key: string]: TranslationTree };

export function pseudoizeTree(input: TranslationTree): TranslationTree {
  if (typeof input === "string") return pseudoize(input);
  if (Array.isArray(input)) return input.map(pseudoizeTree);
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, pseudoizeTree(value)]),
  );
}
