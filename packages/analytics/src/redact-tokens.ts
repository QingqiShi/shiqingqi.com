const PERCENT_ESCAPE = /(%[0-9A-Fa-f]{2})/;
const LONG_RUN = /[\w-]{32,}/g;
const SLUG = /^[a-z0-9]{1,20}(?:-[a-z0-9]{1,20})*$/;

/**
 * The text with each token replaced by `[token]`, wherever it is: in a path
 * such as `/recover/<token>`, in a query value, in a hash or in a message. A
 * token is a run of 32 or more URL-safe characters that is not a slug, such as
 * `altrincham-grammar-school-for-boys`. A token in a URL is a key, so it must
 * not reach an analytics store.
 */
export function redactTokens(text: string): string {
  return text
    .split(PERCENT_ESCAPE)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part.replace(LONG_RUN, (run) => (SLUG.test(run) ? run : "[token]")),
    )
    .join("");
}
