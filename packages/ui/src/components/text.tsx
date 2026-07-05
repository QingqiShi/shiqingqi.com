import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import type { CSSProperties, ReactNode, Ref } from "react";
import { color, font } from "../tokens.stylex.ts";
import { mergeRefs } from "../utils/merge-refs.ts";

type TextElement = "p" | "span" | "div";
type TextVariant = "body" | "bodySmall" | "caption" | "overline";
type TextTone = "default" | "muted" | "subtle" | "accent";
type TextWeight = "regular" | "medium" | "semibold" | "bold";
type TextTransform = "uppercase" | "lowercase" | "capitalize";
type TextAlign = "start" | "center" | "end";

interface TextProps {
  /** Semantic element to render. Defaults to `"p"`. */
  as?: TextElement;
  /** Type-scale ramp. Defaults to `"body"`. */
  variant?: TextVariant;
  /** Foreground colour role. Defaults to `"default"`. */
  tone?: TextTone;
  /** Font weight. `"overline"` defaults to semibold when unset. */
  weight?: TextWeight;
  /**
   * Case transform, decoupled from `variant` — so an uppercase "eyebrow" label
   * can sit at any size (`caption`, `bodySmall`, …) rather than only through the
   * `overline` ramp.
   */
  transform?: TextTransform;
  /** Text alignment (logical `start` / `center` / `end`). */
  align?: TextAlign;
  /** StyleX overrides, composed last so a caller can win over the defaults. */
  css?: StyleXStyles;
  /** Escape-hatch class applied to the rendered element. */
  className?: string;
  /** Inline style applied to the rendered element. */
  style?: CSSProperties;
  /** Ref to the rendered element (`<p>`, `<span>`, or `<div>`). */
  ref?: Ref<HTMLElement>;
  children: ReactNode;
}

/**
 * Body-copy typography primitive. Picks the semantic element via `as` and the
 * type ramp via `variant`, keeping the two decoupled so a `<span>` can still
 * read at body size. Forwards `className`, `style`, and `ref` for escape-hatch
 * composition.
 */
export function Text({
  as = "p",
  variant = "body",
  tone = "default",
  weight,
  transform,
  align,
  css,
  className,
  style,
  ref,
  children,
}: TextProps) {
  const composedCss = [
    styles.base,
    variantStyles[variant],
    toneStyles[tone],
    variant === "overline" && weight === undefined
      ? weightStyles.semibold
      : null,
    weight ? weightStyles[weight] : null,
    transform ? transformStyles[transform] : null,
    align ? alignStyles[align] : null,
    css,
  ];

  // A single callback ref forwards to the caller regardless of which element is
  // rendered; the three elements share `HTMLElement` but not a concrete ref type.
  // `mergeRefs` returns `undefined` when no ref is passed, so nothing is
  // attached during a Server Component render (attaching any ref there is
  // illegal).
  const setRef = mergeRefs(ref);

  switch (as) {
    case "p":
      return (
        <p ref={setRef} css={composedCss} className={className} style={style}>
          {children}
        </p>
      );
    case "span":
      return (
        <span
          ref={setRef}
          css={composedCss}
          className={className}
          style={style}
        >
          {children}
        </span>
      );
    case "div":
      return (
        <div ref={setRef} css={composedCss} className={className} style={style}>
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

const variantStyles = stylex.create({
  body: {
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_4,
  },
  bodySmall: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
  },
  caption: {
    fontSize: font.uiCaption,
    lineHeight: font.lineHeight_3,
  },
  overline: {
    fontSize: font.uiOverline,
    lineHeight: font.lineHeight_3,
    textTransform: "uppercase",
    letterSpacing: font.trackingWidest,
  },
});

const toneStyles = stylex.create({
  default: { color: color.textMain },
  muted: { color: color.textMuted },
  subtle: { color: color.textSubtle },
  accent: { color: color.accentText },
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
