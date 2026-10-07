import * as stylex from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";
import { mergeRefs } from "../merge-refs.ts";
import { typeModifier, typeRole } from "../primitives/type.stylex.ts";
import { color, font, measure } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";

interface TextProps {
  /**
   * Semantic element to render, decoupled from the visual look.
   *
   * @zh 要渲染的语义元素，与视觉字号相互独立。
   */
  as?: "p" | "span" | "div";
  /**
   * Type role that sets the font size, line height, weight and tracking
   * together.
   *
   * @zh 字体角色，同时设定字号、行高、字重与字距。
   */
  look?: "body" | "bodySmall" | "label" | "caption" | "overline";
  /**
   * Foreground colour role, resolved per theme.
   *
   * @zh 前景色角色，随主题解析。
   */
  tone?: "default" | "muted" | "accent";
  /**
   * Overrides the weight that `look` sets.
   *
   * @zh 覆盖 `look` 设定的字重。
   */
  weight?: "regular" | "medium" | "semibold" | "bold";
  /**
   * Case transform, decoupled from `look` — so an uppercase "eyebrow" label
   * can sit at any size (`caption`, `bodySmall`, …) rather than only through the
   * `overline` role.
   *
   * @zh 大小写转换，与 `look` 解耦——因此大写的小标题标签可以在任意字号（`caption`、`bodySmall` 等）下使用，而不必局限于 `overline` 档位。
   */
  transform?: "uppercase" | "lowercase" | "capitalize";
  /**
   * Text alignment (logical `start` / `center` / `end`).
   *
   * @zh 逻辑文本对齐方式。
   */
  align?: "start" | "center" | "end";
  /**
   * How lines break. `"pretty"` avoids stranding one word on the last
   * line — the choice for body copy. `"balance"` evens every line, which
   * suits short standalone copy, though the browser caps how many lines it
   * balances. `"nowrap"` keeps the run on one line.
   *
   * @zh 控制换行方式。`"pretty"` 避免末行只剩一个孤词，是正文的首选；`"balance"` 让每行长度均衡，适合简短独立文案，但浏览器只对有限的行数生效；`"nowrap"` 让文本保持单行。
   */
  wrap?: "balance" | "pretty" | "nowrap";
  /**
   * Renders figures at a fixed width so numbers line up in a column and a
   * ticking value doesn't jitter.
   *
   * @zh 以等宽方式渲染数字，使数字在列中对齐，跳动的数值也不会抖动。
   */
  numeric?: boolean;
  /**
   * Id applied to the rendered element, so another node can point
   * `aria-labelledby` / `aria-describedby` here.
   *
   * @zh 应用到渲染元素上的 `id`，使其他节点可用 `aria-labelledby` 或 `aria-describedby` 指向它。
   */
  id?: string;
  /**
   * StyleX overrides, composed last so a caller can win over the defaults.
   *
   * @zh StyleX 覆盖样式，最后合成，可覆盖默认值。
   */
  css?: StyleProp;
  /**
   * Ref to the rendered element (`<p>`, `<span>`, or `<div>`).
   *
   * @zh 指向渲染的 `<p>`、`<span>` 或 `<div>` 元素的 ref。
   */
  ref?: Ref<HTMLElement>;
  /**
   * Text content to render.
   *
   * @zh 要渲染的文本内容。
   */
  children: ReactNode;
}

/**
 * Body-copy typography primitive. Picks the semantic element via `as` and the
 * type role via `look`, so a `<span>` can still read at body size. A paragraph
 * — `as="p"` at `body` or `bodySmall` — caps its line length at
 * `measure.prose`; pass `css` with `maxInlineSize: "none"` to let it run the
 * full width.
 */
export function Text({
  as = "p",
  look = "body",
  tone = "default",
  weight,
  transform,
  align,
  wrap,
  numeric,
  id,
  css,
  ref,
  children,
}: TextProps) {
  const isProse = as === "p" && (look === "body" || look === "bodySmall");
  const textCss = [
    typeRole[look],
    styles.base,
    isProse ? measureStyles[align ?? "start"] : null,
    toneStyles[tone],
    weight ? weightStyles[weight] : null,
    transform ? transformStyles[transform] : null,
    align ? alignStyles[align] : null,
    wrap ? wrapStyles[wrap] : null,
    numeric === true ? typeModifier.numeric : null,
    css,
  ];

  // Merges into one callback ref, since the three elements share `HTMLElement`
  // but not a concrete ref type. `mergeRefs` returns `undefined` with no ref,
  // so nothing attaches during a Server Component render, where any ref is
  // illegal.
  const setRef = mergeRefs(ref);

  switch (as) {
    case "p":
      return (
        <p ref={setRef} id={id} css={textCss}>
          {children}
        </p>
      );
    case "span":
      return (
        <span ref={setRef} id={id} css={textCss}>
          {children}
        </span>
      );
    case "div":
      return (
        <div ref={setRef} id={id} css={textCss}>
          {children}
        </div>
      );
  }
}

const styles = stylex.create({
  base: {
    margin: 0,
  },
});

// A centred or end-aligned paragraph also moves its capped box. Thus the text
// stays at the aligned position in a container wider than the Measure.
const measureStyles = stylex.create({
  start: { maxInlineSize: measure.prose },
  center: { maxInlineSize: measure.prose, marginInline: "auto" },
  end: { maxInlineSize: measure.prose, marginInlineStart: "auto" },
});

const toneStyles = stylex.create({
  default: { color: color.fg },
  muted: { color: color.fgMuted },
  accent: { color: color.fgAccent },
});

const weightStyles = stylex.create({
  regular: { fontWeight: font.weight_4 },
  medium: { fontWeight: font.weight_5 },
  semibold: { fontWeight: font.weight_6 },
  bold: { fontWeight: font.weight_7 },
});

const transformStyles = stylex.create({
  uppercase: { textTransform: "uppercase" },
  lowercase: { textTransform: "lowercase" },
  capitalize: { textTransform: "capitalize" },
});

const alignStyles = stylex.create({
  start: { textAlign: "start" },
  center: { textAlign: "center" },
  end: { textAlign: "end" },
});

const wrapStyles = stylex.create({
  balance: { textWrap: "balance" },
  pretty: { textWrap: "pretty" },
  nowrap: { textWrap: "nowrap" },
});
