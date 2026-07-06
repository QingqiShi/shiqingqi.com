import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import type { CSSProperties, ReactNode, Ref } from "react";
import { color, font } from "../tokens.stylex.ts";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type HeadingVariant = "display" | "h1" | "h2" | "h3" | "h4";
type HeadingWeight =
  "regular" | "medium" | "semibold" | "bold" | "extrabold" | "black";
type HeadingAlign = "start" | "center" | "end";

interface HeadingProps {
  /** Heading rank `<h1>`–`<h6>`. Drives the semantic element. Defaults to `2`. */
  level?: HeadingLevel;
  /** Type-scale ramp. Defaults to the ramp matching `level`. */
  variant?: HeadingVariant;
  /**
   * Overrides the weight the `variant` sets — e.g. `"regular"` for an elegant
   * light display heading — so a lighter (or heavier) heading no longer needs a
   * hand-rolled `fontWeight`. Shares the `Text` weight vocabulary, extended with
   * `extrabold`/`black` for the display range.
   */
  weight?: HeadingWeight;
  /** Text alignment (logical `start` / `center` / `end`). */
  align?: HeadingAlign;
  /** StyleX overrides, composed last so a caller can win over the defaults. */
  css?: StyleXStyles;
  /** Escape-hatch class applied to the rendered heading. */
  className?: string;
  /** Inline style applied to the rendered heading. */
  style?: CSSProperties;
  /** Ref to the rendered heading element. */
  ref?: Ref<HTMLHeadingElement>;
  children: ReactNode;
}

function defaultVariantForLevel(level: HeadingLevel): HeadingVariant {
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
 * Heading typography primitive. `level` sets the semantic rank while `variant`
 * sets the visual ramp, so an `<h2>` can look like a display heading without
 * breaking the document outline. Forwards `className`, `style`, and `ref`.
 */
export function Heading({
  level = 2,
  variant,
  weight,
  align,
  css,
  className,
  style,
  ref,
  children,
}: HeadingProps) {
  const resolvedVariant = variant ?? defaultVariantForLevel(level);
  const composedCss = [
    styles.base,
    variantStyles[resolvedVariant],
    weight ? weightStyles[weight] : null,
    align ? alignStyles[align] : null,
    css,
  ];

  switch (level) {
    case 1:
      return (
        <h1 ref={ref} css={composedCss} className={className} style={style}>
          {children}
        </h1>
      );
    case 2:
      return (
        <h2 ref={ref} css={composedCss} className={className} style={style}>
          {children}
        </h2>
      );
    case 3:
      return (
        <h3 ref={ref} css={composedCss} className={className} style={style}>
          {children}
        </h3>
      );
    case 4:
      return (
        <h4 ref={ref} css={composedCss} className={className} style={style}>
          {children}
        </h4>
      );
    case 5:
      return (
        <h5 ref={ref} css={composedCss} className={className} style={style}>
          {children}
        </h5>
      );
    case 6:
      return (
        <h6 ref={ref} css={composedCss} className={className} style={style}>
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

const variantStyles = stylex.create({
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
