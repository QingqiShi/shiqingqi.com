import * as stylex from "@stylexjs/stylex";
import { Fragment, type ReactNode } from "react";

const HYPHENATED = /[#\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+/gu;
const MAX_KEPT_CHARS = 24;

function keepInText(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let from = 0;
  for (const match of text.matchAll(HYPHENATED)) {
    if (match[0].length > MAX_KEPT_CHARS) continue;
    parts.push(text.slice(from, match.index));
    parts.push(
      <span key={match.index} css={styles.kept}>
        {match[0]}
      </span>,
    );
    from = match.index + match[0].length;
  }
  if (parts.length === 0) return text;
  parts.push(text.slice(from));
  return parts;
}

/**
 * Keeps each short hyphenated word, such as "to-dos" or "#2026-041", on one line.
 * Haffer does not have the non-breaking hyphen U+2011. Thus, a span holds the word.
 * It changes the text of a string or of an array, such as the result of
 * `t(…, { parse: true })`, but not the text in an element.
 */
export function keepHyphenated(node: ReactNode): ReactNode {
  if (typeof node === "string") return keepInText(node);
  if (Array.isArray(node)) {
    return node.map((child: ReactNode, index) =>
      typeof child === "string" ? (
        <Fragment key={`text-${String(index)}`}>{keepInText(child)}</Fragment>
      ) : (
        child
      ),
    );
  }
  return node;
}

/**
 * Keeps each short hyphenated word on one line in plain text, such as the help
 * text of a field, where a span cannot go. A word joiner (U+2060) follows each
 * hyphen.
 */
export function keepHyphenatedText(text: string): string {
  return text.replace(HYPHENATED, (word) =>
    word.length > MAX_KEPT_CHARS ? word : word.replaceAll("-", "-\u2060"),
  );
}

const styles = stylex.create({
  kept: {
    whiteSpace: "nowrap",
  },
});
