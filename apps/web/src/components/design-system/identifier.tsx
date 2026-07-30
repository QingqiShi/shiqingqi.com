import * as stylex from "@stylexjs/stylex";
import { Fragment } from "react";

function isUpper(character: string) {
  return character >= "A" && character <= "Z";
}

function isLowerOrDigit(character: string) {
  return (
    (character >= "a" && character <= "z") ||
    (character >= "0" && character <= "9")
  );
}

/**
 * Cuts an identifier at its seams: after a group prefix's `.`, and before a
 * camelCase hump. `_` is not a seam — it only introduces a step suffix
 * (`weight_1`, `_00`), and breaking there strands the number away from the word
 * it indexes. Scanned by hand because lookbehind is unsupported in browsers the
 * default Browserslist target still includes.
 */
function splitAtSeams(name: string) {
  const chunks: { text: string; at: number }[] = [];
  let start = 0;
  for (let index = 1; index < name.length; index += 1) {
    const previous = name[index - 1];
    const current = name[index];
    const endsGroupPrefix = previous === ".";
    const startsCamelHump = isLowerOrDigit(previous) && isUpper(current);
    if (endsGroupPrefix || startsCamelHump) {
      chunks.push({ text: name.slice(start, index), at: start });
      start = index;
    }
  }
  chunks.push({ text: name.slice(start), at: start });
  return chunks;
}

interface IdentifierProps {
  /** A token name, prop name, or component name — never prose. */
  children: string;
}

/**
 * An identifier — a token name, a prop name, a Phosphor component name — with
 * `<wbr>` wrap opportunities at its own seams, so a name too long for its card
 * breaks at `color.` / `bg` / `Interactive` / `Selected` rather than mid-word or
 * at an ellipsis. On these pages the name is the content a reader came to copy,
 * so it has to survive the wrap intact.
 */
export function Identifier({ children }: IdentifierProps) {
  return (
    <span css={styles.identifier}>
      {splitAtSeams(children).map(({ text, at }) => (
        <Fragment key={at}>
          {at > 0 ? <wbr /> : null}
          {text}
        </Fragment>
      ))}
    </span>
  );
}

const styles = stylex.create({
  // `break-word` fires only once a chunk cannot fit a line by itself, so it
  // never pre-empts a seam the way `anywhere` would.
  identifier: {
    overflowWrap: "break-word",
  },
});
