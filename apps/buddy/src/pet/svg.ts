import { hashOf } from "./hash-of.ts";

/**
 * Joins a template of SVG markup. Unlike a plain template literal, it takes only strings and
 * numbers, so an object or undefined cannot slip into the markup.
 */
export function svg(
  strings: TemplateStringsArray,
  ...values: ReadonlyArray<string | number>
): string {
  let out = strings[0];
  for (const [i, value] of values.entries()) {
    out += String(value) + strings[i + 1];
  }
  return out;
}

const FONT =
  "-apple-system, system-ui, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

/**
 * The width of a glyph in em. A letter takes the wider of San Francisco and Roboto, so that a box
 * measured from it holds the text on an Apple device and on Android alike.
 */
const GLYPH_GROUPS: ReadonlyArray<readonly [number, string]> = [
  [0.26, "'|ijl"],
  [0.27, ".,:"],
  [0.29, "!;I\\ft"],
  [0.33, " ()[]{}r"],
  [0.38, "/"],
  [0.41, "1"],
  [0.45, '-"*'],
  [0.5, "cvxyzJ`"],
  [0.55, "7k"],
  [0.57, "abdeghnopqsuL_?"],
  [0.6, "023456789#$^~"],
  [0.62, "+<=>FTZ"],
  [0.69, "ABEKPSVXY&"],
  [0.73, "CDHNRUw"],
  [0.79, "GOQ"],
  [0.9, "Mm"],
  [0.95, "W"],
  [0.99, "%"],
  [1, "→"],
  [1.03, "@"],
];

const GLYPH_EM = new Map(
  GLYPH_GROUPS.flatMap(([em, chars]) =>
    Array.from(chars, (ch) => [ch, em] as const),
  ),
);

export function glyphEm(ch: string) {
  const code = ch.codePointAt(0) ?? 0;

  return GLYPH_EM.get(ch) ?? (code >= 0x2e80 ? 1 : 0.6);
}

export function textWidth(text: string, size: number) {
  let em = 0;
  for (const ch of text) em += glyphEm(ch);

  return em * size;
}

export function esc(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function uid(...parts: Array<string | number>) {
  return hashOf(...parts);
}

/**
 * A drawing keeps its aspect ratio and takes the width of its box. A `cover` drawing fills its
 * box instead and crops at the sides, anchored to the bottom centre, so that a first paint at a
 * guessed size still shows the ground and what stands on it.
 */
export function svgOpen(
  width: number,
  height: number,
  { cover = false }: { cover?: boolean } = {},
) {
  const fit = cover
    ? svg` preserveAspectRatio="xMidYMax slice" style="display:block;width:100%;height:100%"`
    : svg` style="display:block;width:100%;height:auto"`;

  return svg`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}" aria-hidden="true"${fit}>`;
}

export function n(value: number) {
  return Number(value.toFixed(1));
}

/**
 * A colour for the light and the dark theme. The SVG is inline in the page, so `light-dark()`
 * follows the `color-scheme` that the site's theme sets on the document.
 */
export function ld(light: string, dark: string) {
  return svg`light-dark(${light},${dark})`;
}

/** The text and track colours that each drawing shares. */
export function paletteCss(id: string) {
  return svg`.t1-${id}{fill:${ld("#1f1e1d", "#ececec")}}.t2-${id}{fill:${ld("#5e5d59", "#a6a39b")}}.t3-${id}{fill:${ld("#8a8780", "#7a776f")}}.bg-${id}{fill:${ld("rgba(0,0,0,0.045)", "rgba(255,255,255,0.055)")}}.tr-${id}{fill:${ld("rgba(0,0,0,0.07)", "rgba(255,255,255,0.08)")}}.bar-${id}{fill:${ld("rgba(0,0,0,0.12)", "rgba(255,255,255,0.14)")}}.str-${id}{stroke:${ld("rgba(0,0,0,0.08)", "rgba(255,255,255,0.08)")}}`;
}

export function todayCss(id: string) {
  return svg`.tdp-${id}{animation:tdp-${id} 1.6s ease-in-out infinite}@keyframes tdp-${id}{0%,100%{opacity:1}50%{opacity:.35}}
.tdr-${id}{fill:none;animation:tdr-${id} 1.6s ease-out infinite}@keyframes tdr-${id}{0%{r:3;opacity:1}100%{r:9;opacity:0}}
@media (prefers-reduced-motion: reduce){.tdp-${id}{animation:none}.tdr-${id}{animation:none;opacity:0}}`;
}
