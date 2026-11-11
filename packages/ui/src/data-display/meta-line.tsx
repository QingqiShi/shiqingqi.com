import * as stylex from "@stylexjs/stylex";
import { isValidElement, type ComponentProps, type ReactNode } from "react";
import { color } from "../color.stylex.ts";
import { isShown } from "../is-shown.ts";
import { border, rhythm } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";

interface MetaLineProps extends Omit<
  ComponentProps<"span">,
  "children" | "className" | "style"
> {
  /**
   * The facts in order: text, a `Badge`, a link, or another `MetaLine` to
   * keep a group of facts together. `null`, `undefined`, booleans and `""` are
   * skipped, so a fact can be conditional. Give an element a `key` when facts
   * before it come and go.
   *
   * @zh 按顺序排列的各项事实：文本、`Badge`、链接，或另一个 `MetaLine`，用来让一组事实保持在一起。`null`、`undefined`、布尔值与 `""` 会被跳过，因此某项事实可以按条件出现。若它前面的事实会出现或消失，请为元素设置 `key`。
   */
  facts: readonly ReactNode[];
  /**
   * StyleX styles merged over the line's own, composed last.
   *
   * @zh 合并在该行自身样式之上的 StyleX 样式，最后合成。
   */
  css?: StyleProp;
}

/**
 * A line of facts with a "·" between each two, such as a status, a provider
 * and the time of the last check. It wraps between facts, and a fact that
 * starts a new line shows no dot. A fact wider than the whole line wraps, or
 * ends in "…" where the line sits in a box that does not wrap. It takes the type and the
 * colour of where it sits; the dots are muted. A fact may shrink below its
 * text, so a chip that truncates its label can.
 */
export function MetaLine({ facts, css, ...restProps }: MetaLineProps) {
  return (
    <span {...restProps} css={[styles.line, css]}>
      {facts.filter(isShown).map((fact, index) => (
        <span
          key={isValidElement(fact) ? (fact.key ?? index) : index}
          css={[styles.fact, index > 0 && styles.follows]}
        >
          {index > 0 ? (
            <span aria-hidden css={styles.dot}>
              ·
            </span>
          ) : null}
          <span css={styles.text}>{fact}</span>
        </span>
      ))}
    </span>
  );
}

// Each dot sits before its fact, pulled back into the column gap. When a fact
// starts a line, its dot falls before the start edge of the box, and the clip
// removes it. At the start edge, the clip keeps the outset of the focus ring
// of `a11y.focusRing` (its width and its offset), so the ring of a fact that
// starts a line stays whole. `clip-path` has no logical sides, so each
// direction takes its own inset.
const RING_OUTSET = `calc(-2 * ${border.size_2})`;
const CLEAR = `calc(-1 * ${rhythm.item})`;

const styles = stylex.create({
  line: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: rhythm.item,
    rowGap: rhythm.inline,
    clipPath: {
      default: `inset(${CLEAR} ${CLEAR} ${CLEAR} ${RING_OUTSET})`,
      ":dir(rtl)": `inset(${CLEAR} ${RING_OUTSET} ${CLEAR} ${CLEAR})`,
    },
  },
  // A fact goes to the next line before it breaks. A fact that is wider than
  // a whole line then follows the line breaks of where the line sits: in a
  // box that does not wrap, such as the detail line of a `ListRow`, it ends
  // in an ellipsis, and elsewhere it wraps.
  fact: {
    display: "inline-flex",
    alignItems: "center",
    minInlineSize: 0,
    maxInlineSize: "100%",
  },
  text: {
    minInlineSize: 0,
    overflowX: "clip",
    textOverflow: "ellipsis",
  },
  follows: {
    marginInlineStart: `calc(-1 * (${rhythm.tight} + ${rhythm.inline}))`,
  },
  dot: {
    flexShrink: 0,
    inlineSize: rhythm.tight,
    marginInlineEnd: rhythm.inline,
    color: color.mutedForeground,
    textAlign: "center",
  },
});
