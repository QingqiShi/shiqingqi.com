/** The parts of an option that a search reads. */
interface Searchable {
  readonly label: string;
  readonly detail?: string;
  readonly keywords?: string;
}

/** Lower case, without accents, so that "zurich" finds "Zürich". */
function fold(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function wordsOf(text: string) {
  return fold(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== "");
}

/** Han, kana and hangul, which a person writes without spaces between words. */
const UNSPACED = /[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Hangul}]/u;

/**
 * The options that the query finds, best first. An option is found when
 * each word of the query starts a word of its label or its detail, or, for
 * a word in a script without spaces, such as Chinese, is somewhere in them.
 * The keywords of an option count as part of its detail.
 * An option whose label starts with the query comes first; the others keep
 * their order.
 *
 * @internal
 */
export function matchOptions<Option extends Searchable>(
  options: readonly Option[],
  query: string,
): Option[] {
  const queryWords = wordsOf(query);
  if (queryWords.length === 0) return [...options];
  const start = fold(query).trim();
  const first: Option[] = [];
  const rest: Option[] = [];
  for (const option of options) {
    const text = `${option.label} ${option.detail ?? ""} ${option.keywords ?? ""}`;
    const folded = fold(text);
    const words = wordsOf(text);
    const isFound = queryWords.every((queryWord) =>
      UNSPACED.test(queryWord)
        ? folded.includes(queryWord)
        : words.some((word) => word.startsWith(queryWord)),
    );
    if (!isFound) continue;
    if (fold(option.label).startsWith(start)) first.push(option);
    else rest.push(option);
  }
  return [...first, ...rest];
}
