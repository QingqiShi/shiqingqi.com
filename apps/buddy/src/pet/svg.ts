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

const GLYPH_EM: Record<string, number> = {
  " ": 0.33,
  "%": 0.99,
  ".": 0.27,
  ",": 0.27,
  "/": 0.38,
  ":": 0.27,
  $: 0.6,
  "+": 0.61,
  "1": 0.41,
  "7": 0.55,
  "→": 1,
  B: 0.69,
  M: 0.9,
  k: 0.55,
};

export function textWidth(text: string, size: number) {
  let em = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    em += GLYPH_EM[ch] ?? (code >= 0x2e80 ? 1 : 0.6);
  }

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
