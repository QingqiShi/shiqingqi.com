/**
 * Builds responsive `src` and `srcSet` attributes for a TMDB image.
 *
 * Filters the TMDB size configuration to width-based entries (e.g. "w200"),
 * parses them to numbers, and constructs the image URLs.
 */
export function buildSrcSet(
  baseUrl: string,
  sizesConfig: ReadonlyArray<string>,
  path: string,
) {
  const widths = sizesConfig
    .filter((s) => s.startsWith("w"))
    .map((s) => Number(s.replace("w", "")));

  if (widths.length === 0) {
    return { src: `${baseUrl}original${path}`, srcSet: "" };
  }

  const src = `${baseUrl}w${widths[widths.length - 1]}${path}`;
  const srcSet = widths.map((w) => `${baseUrl}w${w}${path} ${w}w`).join(", ");

  return { src, srcSet };
}
