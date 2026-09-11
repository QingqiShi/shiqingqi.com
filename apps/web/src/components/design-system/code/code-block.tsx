import * as stylex from "@stylexjs/stylex";
import { scrollbar, scrollX } from "@tuja/ui/primitives/layout.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { font } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { codeRun } from "./code-run.stylex.ts";
import { syntax } from "./syntax.stylex.ts";
import type { CodeToken } from "./types.ts";

interface CodeBlockProps {
  /** The runs to draw, in source order. The Babel plugin makes them. */
  source: readonly CodeToken[];
  /** StyleX overrides merged last. */
  css?: StyleProp;
}

/**
 * Draws a snippet as coloured runs. The block scrolls inside itself, so a wide
 * line never makes the doc column wider. `tabIndex` lets a keyboard scroll it.
 */
export function CodeBlock({ source, css }: CodeBlockProps) {
  return (
    <div
      tabIndex={0}
      css={[
        scrollX.base,
        scrollX.focusRing,
        scrollbar.autoHide,
        transition.scrollbarColor,
        styles.scroller,
        css,
      ]}
    >
      <pre css={styles.pre}>
        <code css={styles.code}>
          {source.map(([kind, text], index) => (
            // A run has no identity but its position, and the array is built
            // once by the Babel plugin and never reordered.
            <span key={index} css={codeRun[kind]}>
              {text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

const styles = stylex.create({
  scroller: {
    minInlineSize: 0,
  },
  pre: {
    margin: 0,
  },
  code: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: syntax.plain,
    whiteSpace: "pre",
  },
});
