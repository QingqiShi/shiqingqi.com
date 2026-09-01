import * as stylex from "@stylexjs/stylex";
import { scrollbar, scrollX } from "@tuja/ui/primitives/layout.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import type { StyleProp } from "@tuja/ui/style-prop";
import { font } from "@tuja/ui/tokens.stylex";
import type { CodeToken } from "./code-token.ts";
import { syntax } from "./syntax.stylex.ts";

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
            <span key={index} css={kindStyles[kind]}>
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

const kindStyles = stylex.create({
  plain: { color: syntax.plain },
  keyword: { color: syntax.keyword },
  string: { color: syntax.string },
  comment: { color: syntax.comment, fontStyle: "italic" },
  number: { color: syntax.number },
  tag: { color: syntax.tag },
  component: { color: syntax.component },
  attr: { color: syntax.attr },
  property: { color: syntax.property },
  punct: { color: syntax.punct },
});
