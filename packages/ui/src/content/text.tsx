import * as stylex from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";
import { mergeRefs } from "../merge-refs.ts";
import { textTone } from "../primitives/tone.stylex.ts";
import { typeModifier, typeRole } from "../primitives/type.stylex.ts";
import { font, measure } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";

interface TextProps {
  /**
   * Semantic element to render, decoupled from the visual look. A term or a
   * description of a `dl`, an item of a list and the caption of a figure
   * are text too, so `Text` renders them.
   *
   * @zh 要渲染的语义元素，与视觉字号相互独立。`dl` 中的术语与描述、列表项和图注同样是文字，因此也由 `Text` 渲染。
   */
  as?: "p" | "span" | "div" | "li" | "dt" | "dd" | "figcaption";
  /**
   * Type role that sets the font size, line height, weight and tracking
   * together.
   *
   * @zh 字体角色，同时设定字号、行高、字重与字距。
   */
  look?: "body" | "bodySmall" | "control" | "label" | "caption" | "overline";
  /**
   * Foreground colour role, resolved per theme. `"destructive"` is for a line that
   * says something went wrong and asks the reader to act, such as an inline
   * error under a row; it matches the error text of a field. `"success"`,
   * `"warning"` and `"info"` take the text colour of their Intent, such as a
   * positive amount in `"success"`. A colour alone does not say what it
   * means, so keep the meaning in the words or the sign as well.
   *
   * @zh 前景色角色，随主题解析。`"destructive"` 用于说明出了问题、需要读者处理的一行文字，例如列表行下方的内联错误，与表单字段的错误文字一致。`"success"`、`"warning"` 与 `"info"` 使用各自意图的文字颜色，例如以 `"success"` 显示正数金额。颜色本身不能说明含义，因此文字或符号也要表达它。
   */
  tone?:
    | "default"
    | "muted"
    | "primary"
    | "success"
    | "warning"
    | "destructive"
    | "info";
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
   * line — the choice for body copy, and the default of a paragraph.
   * `"balance"` evens every line, which suits short standalone copy, though
   * the browser caps how many lines it balances. `"nowrap"` keeps the run on one line.
   *
   * @zh 控制换行方式。`"pretty"` 避免末行只剩一个孤词，是正文的首选，也是段落的默认值；`"balance"` 让每行长度均衡，适合简短独立文案，但浏览器只对有限的行数生效；`"nowrap"` 让文本保持单行。
   */
  wrap?: "balance" | "pretty" | "nowrap";
  /**
   * The width cap of a paragraph. `"prose"` stops its lines at
   * `measure.prose`, so the eye finds the next one. `"none"` lets it run the
   * width of its box, for a note inside a card or a row whose other lines
   * already run that wide. Only a paragraph takes a cap. Defaults to
   * `"prose"`.
   *
   * @zh 段落的宽度上限。`"prose"` 让行在 `measure.prose` 处换行，便于视线找到下一行；`"none"` 让段落占满容器宽度，用于卡片或列表行中的说明，其周围的行已占满该宽度。只有段落才有上限。默认为 `"prose"`。
   */
  measure?: "prose" | "none";
  /**
   * Renders figures at a fixed width so numbers line up in a column and a
   * ticking value doesn't jitter.
   *
   * @zh 以等宽方式渲染数字，使数字在列中对齐，跳动的数值也不会抖动。
   */
  numeric?: boolean;
  /**
   * Shows the text as a person or an agent wrote it: "(1)", "2x3" and "->"
   * stay as typed, where Haffer would draw "①", "2×3" and "→". Use it for a
   * name, a note or a message, never for the app's own copy.
   *
   * @zh 按人或智能体写下的原样显示文字："(1)"、"2x3" 与 "->" 保持原样，而不是被 Haffer 画成 "①"、"2×3" 与 "→"。用于名称、备注或消息，不用于应用自己的文案。
   */
  verbatim?: boolean;
  /**
   * Shows at most this many lines and ends the last one with "…". A word too
   * long for a line breaks, so the text never widens its box. The full text
   * stays in the page, so a screen reader still reads all of it.
   *
   * @zh 最多显示这么多行，并在最后一行末尾加 "…"。过长的单词会断开，因此文字不会撑宽容器。完整文字仍在页面中，屏幕阅读器仍会读出全部内容。
   */
  lines?: number;
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
   * Ref to the rendered element.
   *
   * @zh 指向渲染元素的 ref。
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
 * `measure.prose` and wraps `"pretty"`; `measure="none"` lets it run the
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
  measure = "prose",
  numeric,
  verbatim,
  lines,
  id,
  css,
  ref,
  children,
}: TextProps) {
  const isProse = as === "p" && (look === "body" || look === "bodySmall");
  const textCss = [
    typeRole[look],
    styles.base,
    isProse && measure === "prose" ? measureStyles[align ?? "start"] : null,
    isProse ? wrapStyles.pretty : null,
    textTone[tone],
    weight ? weightStyles[weight] : null,
    transform ? transformStyles[transform] : null,
    align ? alignStyles[align] : null,
    wrap ? wrapStyles[wrap] : null,
    numeric === true ? typeModifier.numeric : null,
    verbatim === true ? typeModifier.verbatim : null,
    lines === undefined ? null : typeModifier.lines(lines),
    css,
  ];

  // Merges into one callback ref, since the elements share `HTMLElement`
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
    case "li":
      return (
        <li ref={setRef} id={id} css={textCss}>
          {children}
        </li>
      );
    case "dt":
      return (
        <dt ref={setRef} id={id} css={textCss}>
          {children}
        </dt>
      );
    case "dd":
      return (
        <dd ref={setRef} id={id} css={textCss}>
          {children}
        </dd>
      );
    case "figcaption":
      return (
        <figcaption ref={setRef} id={id} css={textCss}>
          {children}
        </figcaption>
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
