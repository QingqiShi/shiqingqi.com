"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, space } from "@tuja/ui/tokens.stylex";
import { Fragment, type ReactNode } from "react";
import { useCopyToClipboard } from "#src/clipboard/use-copy-to-clipboard.ts";
import { outlineEdge } from "./outline-edge.stylex.ts";

type CopyBlockProps = {
  /** What the reader copies whole. */
  text: string;
  /** What the text is, such as the app or the file it goes in. */
  label: string;
  /**
   * `code` is a command or a file's content, in a fixed-width font; `message` is words for Claude,
   * in the body font, with each name between backticks, such as a path, in the fixed-width font.
   * A message is the step's main action, so its Copy is filled; a code block's Copy is outlined.
   */
  kind: "code" | "message";
};

/** Text to carry to the Mac, under a header that names it and copies all of it. */
export function CopyBlock({ text, label, kind }: CopyBlockProps) {
  const { isCopied, copy } = useCopyToClipboard(text);

  return (
    <div css={[corner.radius_2, styles.block]}>
      <div css={[row.tight, styles.header]}>
        <span css={[typeRole.caption, styles.label]}>{label}</span>
        <Button
          size="sm"
          look={kind === "message" ? "primary" : "outline"}
          css={kind === "code" && outlineEdge.control}
          icon={
            isCopied ? (
              <CheckIcon weight="bold" aria-hidden />
            ) : (
              <CopyIcon weight="bold" aria-hidden />
            )
          }
          onClick={copy}
        >
          {isCopied
            ? t({ en: "Copied", zh: "已复制" })
            : t({ en: "Copy", zh: "复制" })}
        </Button>
      </div>
      {kind === "message" ? (
        <p css={[typeRole.bodySmall, styles.body, styles.message]}>
          {setNames(text)}
        </p>
      ) : (
        <pre css={[typeRole.bodySmall, styles.body, styles.code]}>
          {text.split("\n").map((line, index) => (
            <span
              key={index}
              css={[
                styles.line,
                styles.hang(line.length - line.trimStart().length),
              ]}
            >
              {line}
            </span>
          ))}
        </pre>
      )}
      <span role="status" css={a11y.srOnly}>
        {isCopied ? t({ en: "Copied", zh: "已复制" }) : ""}
      </span>
    </div>
  );
}

/** Punctuation that must stay on the line of the name before it. */
const CLOSING_PUNCTUATION = /^[,.;:!?)，。；：！？）、]+/u;

/** Sets each name between backticks in the fixed-width font, as one unit with the punctuation after it. */
function setNames(text: string): ReactNode[] {
  const parts = text.split("`");
  return parts.map((part, index) => {
    if (index % 2 === 0) {
      const glued =
        index > 0 ? (CLOSING_PUNCTUATION.exec(part)?.[0] ?? "") : "";
      return <Fragment key={index}>{part.slice(glued.length)}</Fragment>;
    }
    const after = CLOSING_PUNCTUATION.exec(parts[index + 1] ?? "")?.[0] ?? "";
    return (
      <span key={index} css={styles.name}>
        <code css={styles.code}>{part}</code>
        {after}
      </span>
    );
  });
}

/** How much further than its first line a wrapped line of code starts. */
const HANG_CH = 2;

const styles = stylex.create({
  block: {
    backgroundColor: color.bgControlSunken,
  },
  header: {
    justifyContent: "space-between",
    paddingBlockStart: space._1,
    paddingInlineStart: space._2,
    paddingInlineEnd: space._1,
  },
  label: {
    color: color.fgMuted,
  },
  body: {
    margin: 0,
    paddingBlockStart: space._1,
    paddingBlockEnd: space._2,
    paddingInline: space._2,
  },
  message: {
    color: color.fg,
  },
  // A name moves to the next line whole. Only a name wider than the line
  // breaks inside.
  name: {
    display: "inline-block",
    maxInlineSize: "100%",
    overflowWrap: "anywhere",
  },
  code: {
    fontFamily: font.familyMono,
  },
  // A line that is wider than the box wraps, and the rest of it starts
  // further in than its first line, so it does not look like a new line.
  line: {
    display: "block",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  hang: (indent: number) => ({
    paddingInlineStart: `${String(indent + HANG_CH)}ch`,
    textIndent: `${String(-(indent + HANG_CH))}ch`,
  }),
});
