import * as stylex from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";
import { color, font } from "../../tokens.stylex.ts";
import type { StyleProp } from "../../types.ts";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type HeadingLook = "display" | "h1" | "h2" | "h3" | "h4";
interface HeadingProps {
  /**
   * Semantic heading rank, driving the rendered `<h1>`–`<h6>` element.
   *
   * @zh 语义标题层级，决定渲染的 `<h1>`–`<h6>` 元素。
   */
  level?: HeadingLevel;
  /**
   * Type-scale step, decoupled from `level` so rank and size can differ.
   * Defaults to the step matching `level`.
   *
   * @zh 视觉字号档位，与 `level` 解耦，使层级与字号可以不同；默认使用与 `level` 匹配的字号。
   */
  look?: HeadingLook;
  /**
   * Overrides the weight `look` sets, extending `Text`'s weight vocabulary
   * with `extrabold`/`black` for the display range.
   *
   * @zh 覆盖 `look` 设定的字重，在 `Text` 的字重体系基础上为 display 范围扩展了 `extrabold`/`black`。
   */
  weight?: "regular" | "medium" | "semibold" | "bold" | "extrabold" | "black";
  /**
   * Text alignment (logical `start` / `center` / `end`).
   *
   * @zh 逻辑文本对齐方式。
   */
  align?: "start" | "center" | "end";
  /**
   * How lines break, via CSS `text-wrap`. `"balance"` is the one headings
   * want — it evens the lines so a two-line title doesn't strand a word.
   *
   * @zh 换行方式，基于 CSS `text-wrap`。`"balance"` 正是标题需要的模式——它让各行长度均衡，使两行标题不会孤零零地留下一个词。
   */
  wrap?: "balance" | "pretty" | "nowrap";
  /**
   * Id applied to the rendered heading, so a region can name itself with
   * `aria-labelledby` pointing here.
   *
   * @zh 应用到渲染标题上的 `id`，使某个区域可用 `aria-labelledby` 指向它来命名自身。
   */
  id?: string;
  /**
   * StyleX overrides, composed last so a caller can win over the defaults.
   *
   * @zh StyleX 覆盖样式，最后合成，可覆盖默认值。
   */
  css?: StyleProp;
  /**
   * Ref to the rendered heading element.
   *
   * @zh 指向渲染标题元素的 ref。
   */
  ref?: Ref<HTMLHeadingElement>;
  /**
   * Heading content to render.
   *
   * @zh 要渲染的标题内容。
   */
  children: ReactNode;
}

function defaultLookForLevel(level: HeadingLevel): HeadingLook {
  switch (level) {
    case 1:
      return "h1";
    case 2:
      return "h2";
    case 3:
      return "h3";
    default:
      return "h4";
  }
}

/**
 * Heading typography primitive: `level` sets the semantic rank while
 * `look` sets the visual step, so an `<h2>` can look like a display
 * heading without breaking the document outline. Forwards `ref`.
 */
export function Heading({
  level = 2,
  look,
  weight,
  align,
  wrap,
  id,
  css,
  ref,
  children,
}: HeadingProps) {
  const resolvedLook = look ?? defaultLookForLevel(level);
  const headingCss = [
    styles.base,
    lookStyles[resolvedLook],
    weight ? weightStyles[weight] : null,
    align ? alignStyles[align] : null,
    wrap ? wrapStyles[wrap] : null,
    css,
  ];

  switch (level) {
    case 1:
      return (
        <h1 ref={ref} id={id} css={headingCss}>
          {children}
        </h1>
      );
    case 2:
      return (
        <h2 ref={ref} id={id} css={headingCss}>
          {children}
        </h2>
      );
    case 3:
      return (
        <h3 ref={ref} id={id} css={headingCss}>
          {children}
        </h3>
      );
    case 4:
      return (
        <h4 ref={ref} id={id} css={headingCss}>
          {children}
        </h4>
      );
    case 5:
      return (
        <h5 ref={ref} id={id} css={headingCss}>
          {children}
        </h5>
      );
    case 6:
      return (
        <h6 ref={ref} id={id} css={headingCss}>
          {children}
        </h6>
      );
  }
}

const styles = stylex.create({
  base: {
    margin: 0,
    color: color.textMain,
  },
});

const lookStyles = stylex.create({
  display: {
    fontSize: font.uiDisplay,
    fontWeight: font.weight_8,
    lineHeight: font.lineHeight_1,
    letterSpacing: font.trackingTight,
  },
  h1: {
    fontSize: font.uiHeading1,
    fontWeight: font.weight_8,
    lineHeight: font.lineHeight_2,
    letterSpacing: font.trackingSnug,
  },
  h2: {
    fontSize: font.uiHeading2,
    fontWeight: font.weight_7,
    lineHeight: font.lineHeight_2,
  },
  h3: {
    fontSize: font.uiHeading3,
    fontWeight: font.weight_7,
    lineHeight: font.lineHeight_2,
  },
  h4: {
    fontSize: font.uiBody,
    fontWeight: font.weight_7,
    lineHeight: font.lineHeight_3,
  },
});

const weightStyles = stylex.create({
  regular: { fontWeight: font.weight_4 },
  medium: { fontWeight: font.weight_5 },
  semibold: { fontWeight: font.weight_6 },
  bold: { fontWeight: font.weight_7 },
  extrabold: { fontWeight: font.weight_8 },
  black: { fontWeight: font.weight_9 },
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
