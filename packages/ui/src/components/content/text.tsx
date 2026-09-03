import * as stylex from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";
import type { StyleProp } from "../../style-prop.ts";
import { color, font } from "../../tokens.stylex.ts";
import { mergeRefs } from "../../utils/merge-refs.ts";

type TextElement = "p" | "span" | "div";
type TextVariant = "body" | "bodySmall" | "caption" | "overline";
type TextTone = "default" | "muted" | "subtle" | "accent";
type TextWeight = "regular" | "medium" | "semibold" | "bold";
type TextTransform = "uppercase" | "lowercase" | "capitalize";
type TextAlign = "start" | "center" | "end";
type TextWrap = "balance" | "pretty" | "nowrap";

interface TextProps {
  /** Semantic element to render. Defaults to `"p"`. */
  as?: TextElement;
  /** Type-scale step. Defaults to `"body"`. */
  variant?: TextVariant;
  /** Foreground colour role. Defaults to `"default"`. */
  tone?: TextTone;
  /** Font weight. `"overline"` defaults to semibold when unset. */
  weight?: TextWeight;
  /**
   * Case transform, decoupled from `variant` — so an uppercase "eyebrow" label
   * can sit at any size (`caption`, `bodySmall`, …) rather than only through the
   * `overline` step.
   */
  transform?: TextTransform;
  /** Text alignment (logical `start` / `center` / `end`). */
  align?: TextAlign;
  /**
   * How lines break: `"pretty"` for body copy, `"balance"` for short
   * standalone copy (a few lines at most), `"nowrap"` to keep the run on one
   * line.
   */
  wrap?: TextWrap;
  /**
   * Renders figures at a fixed width so numbers line up in a column and a
   * ticking value doesn't jitter.
   */
  numeric?: boolean;
  /**
   * Id applied to the rendered element, so another node can point
   * `aria-labelledby` / `aria-describedby` here.
   */
  id?: string;
  /** StyleX overrides, composed last so a caller can win over the defaults. */
  css?: StyleProp;
  /** Ref to the rendered element (`<p>`, `<span>`, or `<div>`). */
  ref?: Ref<HTMLElement>;
  children: ReactNode;
}

/**
 * Body-copy typography primitive. Picks the semantic element via `as` and the
 * type step via `variant`, so a `<span>` can still read at body size.
 */
export function Text({
  as = "p",
  variant = "body",
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
  const textCss = [
    styles.base,
    variantStyles[variant],
    toneStyles[tone],
    variant === "overline" && weight === undefined
      ? weightStyles.semibold
      : null,
    weight ? weightStyles[weight] : null,
    transform ? transformStyles[transform] : null,
    align ? alignStyles[align] : null,
    wrap ? wrapStyles[wrap] : null,
    numeric === true ? styles.numeric : null,
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
  // `tabular-nums` alone: Inter already lines figures by default, so pinning
  // that too would be redundant.
  numeric: {
    fontVariantNumeric: "tabular-nums",
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

const wrapStyles = stylex.create({
  balance: { textWrap: "balance" },
  pretty: { textWrap: "pretty" },
  nowrap: { textWrap: "nowrap" },
});
