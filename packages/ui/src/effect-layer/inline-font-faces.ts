/** A font file as a `data:` URL, or `null` when it cannot be fetched. */
const fontFiles = new Map<string, Promise<string | null>>();

function fontFileOf(url: string) {
  let file = fontFiles.get(url);
  if (file === undefined) {
    file = fetch(url)
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => (blob === null ? null : dataUrlOf(blob)))
      .catch(() => null);
    fontFiles.set(url, file);
  }
  return file;
}

function dataUrlOf(blob: Blob) {
  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = () => {
      resolve(null);
    };
    reader.readAsDataURL(blob);
  });
}

/** A family name as `font-family` lists it, without quotes, in lower case. */
function familyKey(family: string) {
  return family
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase();
}

/**
 * Each family that a computed `font-family` lists.
 *
 * @internal
 */
export function familiesOf(fontFamily: string) {
  return fontFamily.split(",").map(familyKey);
}

const faceKey = (family: string, weight: string, style: string) =>
  `${family}|${weight}|${style}`;

function* fontFaceRules(rules: CSSRuleList): Generator<CSSFontFaceRule> {
  for (const rule of rules) {
    if (rule instanceof CSSFontFaceRule) {
      yield rule;
    } else if (rule instanceof CSSGroupingRule) {
      yield* fontFaceRules(rule.cssRules);
    }
  }
}

function* documentFontFaceRules() {
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    yield* fontFaceRules(rules);
  }
}

const URL_IN_SRC = /url\(\s*(["']?)([^"')]+)\1\s*\)/g;

async function facesOf(families: ReadonlySet<string>) {
  const loaded = new Set<string>();
  for (const face of document.fonts) {
    if (face.status === "loaded") {
      loaded.add(faceKey(familyKey(face.family), face.weight, face.style));
    }
  }
  const rules = [...documentFontFaceRules()].filter(({ style }) => {
    const family = familyKey(style.getPropertyValue("font-family"));
    const key = faceKey(
      family,
      style.getPropertyValue("font-weight") || "normal",
      style.getPropertyValue("font-style") || "normal",
    );
    return families.has(family) && loaded.has(key);
  });
  const inlined = await Promise.all(
    rules.map(async (rule) => {
      const base = rule.parentStyleSheet?.href ?? document.baseURI;
      const urls = [...rule.cssText.matchAll(URL_IN_SRC)].map(
        ([, , url]) => new URL(url, base).href,
      );
      const files = await Promise.all(urls.map(fontFileOf));
      if (!files.every((file): file is string => file !== null)) {
        return "";
      }
      let index = 0;
      return rule.cssText.replace(URL_IN_SRC, () => `url("${files[index++]}")`);
    }),
  );
  return inlined.join("\n");
}

/** The rules for each set of families, until `forgetInlinedFontFaces`. */
const inlinedFaces = new Map<string, Promise<string>>();

/**
 * Makes `inlineFontFaces` read the rules again. Call it when the page loads
 * a font.
 *
 * @internal
 */
export function forgetInlinedFontFaces() {
  inlinedFaces.clear();
}

/**
 * The `@font-face` rules of the page for `families`, with each font file in
 * the rule as a `data:` URL, so that an SVG image can use them. A page's
 * `@font-face` rules do not apply in an SVG image, and the image cannot
 * load a file. Only the faces that the page has loaded are in the rules:
 * when the page could not load a face, it shows the next family, and the
 * image does the same.
 *
 * @internal
 */
export function inlineFontFaces(families: ReadonlySet<string>) {
  const key = [...families].sort().join(",");
  let faces = inlinedFaces.get(key);
  if (faces === undefined) {
    faces = facesOf(families);
    inlinedFaces.set(key, faces);
  }
  return faces;
}
