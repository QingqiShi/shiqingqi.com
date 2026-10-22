import { payeeNameKey } from "../domain/payees/payee-name-key.ts";
import { cleanPayeeName } from "./clean-payee-name.ts";

const MAX_WORDS = 4;
const MAX_CANDIDATES = 30;

/** Words of bank text that never name a merchant or a person on their own. */
export const BANK_TEXT_NOISE: ReadonlySet<string> = new Set([
  "a",
  "and",
  "apr",
  "aug",
  "at",
  "bank",
  "bill",
  "by",
  "card",
  "ch",
  "charge",
  "contactless",
  "cp",
  "credit",
  "dd",
  "debit",
  "dec",
  "direct",
  "eur",
  "feb",
  "fee",
  "for",
  "from",
  "gb",
  "gbp",
  "in",
  "jan",
  "jul",
  "jun",
  "london",
  "ltd",
  "mar",
  "may",
  "nov",
  "oct",
  "of",
  "on",
  "online",
  "payment",
  "pos",
  "purchase",
  "ref",
  "sep",
  "so",
  "the",
  "to",
  "tfr",
  "transfer",
  "uk",
  "usd",
  "via",
  "www",
]);

/** Words that cannot start or end a name. */
const CONNECTORS = new Set([
  "&",
  "and",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "the",
  "to",
  "via",
]);

const DOMAIN =
  /\b(?:www\.)?(\p{L}[\p{L}\p{N}-]*)((?:\.[\p{L}\p{N}-]+)*\.(?:com|uk|eu|net|org|io|app|tv))\b/giu;

function isNameWord(word: string) {
  return word === "&" || (/\p{L}/u.test(word) && !/\p{N}/u.test(word));
}

/** "TESCO" is "Tesco", "ODD" is "Odd", "TO" is "to"; "TFL", "M&S" and "McDonald's" stay as the bank wrote them. */
function normalCase(word: string) {
  if (/\p{Ll}/u.test(word)) return word;
  if (CONNECTORS.has(word.toLowerCase())) return word.toLowerCase();
  const letters = word.replace(/[^\p{L}]/gu, "");
  const initials =
    letters.length <= 2 || (letters.length === 3 && !/[aeiouy]/i.test(letters));
  if (initials) return word;
  return word.charAt(0) + word.slice(1).toLowerCase();
}

function runsOf(text: string): string[][] {
  const runs: string[][] = [];
  for (const segment of text.split(/[*|/\\,;:()[\]]+|\s-\s|\.(?=\s|$)/)) {
    let run: string[] = [];
    for (const word of segment.split(/\s+/).filter(Boolean)) {
      if (isNameWord(word) && !word.includes(".")) {
        run.push(
          word === "&" ? word : word.replace(/^[^\p{L}]+|[^\p{L}'&]+$/gu, ""),
        );
      } else if (run.length > 0) {
        runs.push(run);
        run = [];
      }
    }
    if (run.length > 0) runs.push(run);
  }
  return runs;
}

/**
 * Payee names cut from the bank text, for the model to choose from: the
 * merchant as the bank gave it, each domain ("Booking.com"), then each run
 * of up to four name words, in normal capitalisation, without store
 * numbers, card numbers or reference codes. Names with the same {@link payeeNameKey} appear once.
 */
export function payeeNameCandidates(merchant: string, description: string) {
  const names: string[] = [];
  const merchantName = cleanPayeeName(merchant);
  if (merchantName && !/^[\p{Lu}\p{N}\W]+$/u.test(merchantName)) {
    names.push(merchantName);
  }
  for (const text of [merchant, description]) {
    for (const [, name, ending] of text.matchAll(DOMAIN)) {
      names.push(cleanPayeeName(`${normalCase(name)}${ending.toLowerCase()}`));
    }
  }
  const texts = [merchant, description].map((text) =>
    text.replace(DOMAIN, (_, name: string) => name),
  );
  for (const run of texts.flatMap(runsOf)) {
    for (let length = Math.min(run.length, MAX_WORDS); length > 0; length--) {
      for (let start = 0; start + length <= run.length; start++) {
        const words = run.slice(start, start + length);
        const lower = words.map((word) => word.toLowerCase());
        if (lower.every((word) => BANK_TEXT_NOISE.has(word))) continue;
        if (CONNECTORS.has(lower[0]) || CONNECTORS.has(lower.at(-1) ?? "")) {
          continue;
        }
        names.push(cleanPayeeName(words.map(normalCase).join(" ")));
      }
    }
  }
  const seen = new Set<string>();
  return names
    .filter((name) => {
      const key = payeeNameKey(name);
      if (key.length < 2 || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_CANDIDATES);
}
