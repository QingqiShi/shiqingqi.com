/** Where a candidate icon URL came from, best first among equal sizes. */
export type IconSource =
  | "apple-touch-icon"
  | "manifest"
  | "root-apple-touch-icon"
  | "icon"
  | "favicon-ico";

export interface IconCandidate {
  url: URL;
  /** The largest edge the page declares, or 0 when it declares none. */
  size: number;
  source: IconSource;
}

/** The largest square edge in a `sizes` value such as `16x16 32x32`; 0 for `any` or none. */
function largestDeclaredSize(sizes: string | undefined) {
  let largest = 0;
  for (const token of sizes?.toLowerCase().split(/\s+/) ?? []) {
    const match = /^(\d+)x(\d+)$/.exec(token);
    if (match) {
      largest = Math.max(largest, Math.min(Number(match[1]), Number(match[2])));
    }
  }
  return largest;
}

/** `href` resolved against `base` when it is an http or https URL. */
export function resolveHttpUrl(href: string | undefined, base: URL) {
  if (!href) return null;
  try {
    const url = new URL(href, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function isVector(url: URL, type: string | undefined) {
  return (
    type?.toLowerCase().includes("svg") === true ||
    url.pathname.toLowerCase().endsWith(".svg")
  );
}

function isIco(url: URL, type: string | undefined) {
  const lowerType = type?.toLowerCase();
  return (
    lowerType === "image/x-icon" ||
    lowerType === "image/vnd.microsoft.icon" ||
    url.pathname.toLowerCase().endsWith(".ico")
  );
}

/**
 * A raster icon a page or manifest declares, or null for an SVG or a URL
 * that is not http or https. An `.ico` becomes a `favicon-ico` candidate.
 */
export function iconCandidate(
  declared: {
    href: string | undefined;
    sizes: string | undefined;
    type: string | undefined;
    source: IconSource;
    /** The size to assume when `sizes` gives none. */
    defaultSize?: number;
  },
  base: URL,
): IconCandidate | null {
  const url = resolveHttpUrl(declared.href, base);
  if (url === null || isVector(url, declared.type)) return null;
  return {
    url,
    size: largestDeclaredSize(declared.sizes) || (declared.defaultSize ?? 0),
    source: isIco(url, declared.type) ? "favicon-ico" : declared.source,
  };
}
