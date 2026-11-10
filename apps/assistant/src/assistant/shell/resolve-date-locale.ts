import type { SupportedLocale } from "@tuja/i18n/types";

/** English dates follow British order when the owner's region is not known. */
const FALLBACK_ENGLISH = "en-GB";

/**
 * The most preferred English with a region in an `Accept-Language` header,
 * such as `en-US`, or null when it names none.
 */
export function regionalEnglishOf(
  acceptLanguage: string | null,
): string | null {
  if (!acceptLanguage) return null;
  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params
        .map((param) => /^\s*q=([\d.]+)\s*$/.exec(param)?.[1])
        .find((value) => value !== undefined);
      return { tag: tag.trim(), q: q === undefined ? 1 : Number(q), index };
    })
    .filter(({ q }) => q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { tag } of ranked) {
    try {
      const { language, region } = new Intl.Locale(tag);
      if (language === "en" && region) return `en-${region}`;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * The locale that dates and times are written in: Chinese for Chinese pages,
 * and for English the owner's regional English when it is known, else British.
 */
export function resolveDateLocale(
  locale: SupportedLocale,
  regionalEnglish: string | null,
): string {
  if (locale === "zh") return "zh";
  return regionalEnglish ?? FALLBACK_ENGLISH;
}
