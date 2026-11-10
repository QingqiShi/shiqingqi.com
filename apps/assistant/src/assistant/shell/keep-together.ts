const WORD_JOINER = "\u2060";
const CJK =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3000-\u303f\uff00-\uffef]/u;
const DASH = /[-\u2010-\u2015]/;
const characters = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function breaksBetween(before: string, after: string) {
  if (before === WORD_JOINER || after === WORD_JOINER) return false;
  return CJK.test(before) || CJK.test(after) || DASH.test(before);
}

/**
 * Keeps a date or a time, such as "Tue 10 Nov" or "11月10日周二", on one line
 * wherever it goes, also into a toast or a template string where a span
 * cannot go. Its spaces do not break, and a word joiner (U+2060) goes where a
 * line could break between two characters.
 */
export function keepTogether(text: string): string {
  const chars = Array.from(
    characters.segment(
      text.replaceAll(" ", "\u00a0").replaceAll("\u2009", "\u202f"),
    ),
    ({ segment }) => segment,
  );
  return chars
    .map((char, index) =>
      index > 0 && breaksBetween(chars[index - 1], char)
        ? `${WORD_JOINER}${char}`
        : char,
    )
    .join("");
}
