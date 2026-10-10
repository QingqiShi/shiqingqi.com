import { reportImageCopy, type ReportImageCopy } from "./report-image-copy.ts";

export interface ReportFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
}

const FONT_NAME = "Noto Sans SC";
const WEIGHTS: readonly ReportFont["weight"][] = [400, 700];
const SUBSET_TIMEOUT_MS = 5_000;
const FULL_TIMEOUT_MS = 20_000;
const FULL_RETRY_AFTER_MS = 5 * 60_000;

function copyText(copy: ReportImageCopy) {
  const { moreAccounts, ...strings } = copy;
  return Object.values<string>(strings).join("") + moreAccounts(0);
}

/**
 * The characters of every image that holds no Household names: printable
 * ASCII, currency and punctuation signs, the image copy in both languages,
 * and the Chinese date and compact-number characters.
 */
export const FIXED_CHARACTERS = [
  ...new Set(
    Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index))
      .join("")
      .concat(
        "£€¥$%+−–—·…，。、：（）",
        "年月日万亿千",
        copyText(reportImageCopy.en),
        copyText(reportImageCopy.zh),
      ),
  ),
]
  .sort()
  .join("");

const fixedCharacters = new Set(FIXED_CHARACTERS);

/**
 * A font loader with its own cache. Google Fonts never sees Household data:
 * an image whose characters are all in `FIXED_CHARACTERS` gets Noto Sans SC
 * cut down to that fixed set, and any other image (Account, Group or
 * Category names) gets the whole family, fetched once per loader. When the
 * whole family cannot be loaded in time, the fixed subset is used and other
 * characters are left out.
 */
export function createReportFontLoader(fetchImpl: typeof fetch) {
  const cache = new Map<string, Promise<ArrayBuffer>>();
  let fullRetryAt = 0;

  async function fetchFont(
    weight: number,
    text: string | null,
  ): Promise<ArrayBuffer> {
    const signal = AbortSignal.timeout(
      text === null ? FULL_TIMEOUT_MS : SUBSET_TIMEOUT_MS,
    );
    const query = new URLSearchParams({
      family: `${FONT_NAME}:wght@${String(weight)}`,
    });
    if (text !== null) query.set("text", text);
    const cssResponse = await fetchImpl(
      `https://fonts.googleapis.com/css2?${query.toString()}`,
      { signal },
    );
    if (!cssResponse.ok) {
      throw new Error(`Font CSS request failed: ${String(cssResponse.status)}`);
    }
    const css = await cssResponse.text();
    const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(
      css,
    )?.[1];
    if (!url) throw new Error("Font CSS has no TrueType source");
    const fontResponse = await fetchImpl(url, { signal });
    if (!fontResponse.ok) {
      throw new Error(`Font request failed: ${String(fontResponse.status)}`);
    }
    return fontResponse.arrayBuffer();
  }

  function cachedFont(weight: number, text: string | null) {
    const key = `${String(weight)}:${text === null ? "full" : "fixed"}`;
    let font = cache.get(key);
    if (!font) {
      font = fetchFont(weight, text);
      font.catch(() => cache.delete(key));
      cache.set(key, font);
    }
    return font;
  }

  async function loadSet(text: string | null) {
    return Promise.all(
      WEIGHTS.map(async (weight) => {
        const font: ReportFont = {
          name: FONT_NAME,
          data: await cachedFont(weight, text),
          weight,
          style: "normal",
        };
        return font;
      }),
    );
  }

  return async function loadReportFonts(text: string): Promise<ReportFont[]> {
    const fits = Array.from(text).every(
      (character) => fixedCharacters.has(character) || /\s/.test(character),
    );
    if (!fits && Date.now() >= fullRetryAt) {
      try {
        return await loadSet(null);
      } catch (error) {
        fullRetryAt = Date.now() + FULL_RETRY_AFTER_MS;
        console.error("Report fonts: the whole family failed to load", error);
      }
    }
    return loadSet(FIXED_CHARACTERS);
  };
}

/** Noto Sans SC in regular and bold for the share image of `text`; see `createReportFontLoader`. */
export const loadReportFonts = createReportFontLoader((input, init) =>
  fetch(input, init),
);
