import * as stylex from "@stylexjs/stylex";
import type { CSSProperties, Ref } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import { color } from "../tokens.stylex.ts";
import { mergeRefs } from "../utils/merge-refs.ts";

type DividerOrientation = "horizontal" | "vertical";
type DividerVariant = "subtle" | "bold" | "decorative";

interface DividerProps {
  /** Line direction. Defaults to `"horizontal"`. */
  orientation?: DividerOrientation;
  /** Weight / treatment of the rule. Defaults to `"subtle"`. */
  variant?: DividerVariant;
  /** StyleX overrides, composed last so a caller can win over the defaults. */
  css?: StyleProp;
  /** Escape-hatch class applied to the rendered rule. */
  className?: string;
  /** Inline style applied to the rendered rule. */
  style?: CSSProperties;
  /** Ref to the rendered element (`<hr>` when horizontal, `<div>` when vertical). */
  ref?: Ref<HTMLElement>;
}

/**
 * Thin separator rule. Renders a semantic `<hr>` when horizontal and a
 * `role="separator"` `<div>` when vertical (an `<hr>` cannot be turned on its
 * side accessibly). Forwards `className`, `style`, and `ref`.
 */
export function Divider({
  orientation = "horizontal",
  variant = "subtle",
  css,
  className,
  style,
  ref,
}: DividerProps) {
  // A single callback ref forwards to the caller for either rendered element;
  // `<hr>` and `<div>` share `HTMLElement` but not a concrete ref type.
  // `mergeRefs` returns `undefined` when no ref is passed, so nothing is
  // attached during a Server Component render (attaching any ref there is
  // illegal).
  const setRef = mergeRefs(ref);

  // The `decorative` variant is an ornamental gradient flourish, not a content
  // boundary, so it opts out of the `separator` role rather than announcing one.
  const decorative = variant === "decorative";

  if (orientation === "vertical") {
    const composedCss = [
      styles.base,
      styles.vertical,
      verticalVariantStyles[variant],
      css,
    ];
    return (
      <div
        role={decorative ? "presentation" : "separator"}
        aria-orientation={decorative ? undefined : "vertical"}
        ref={setRef}
        css={composedCss}
        className={className}
        style={style}
      />
    );
  }

  const composedCss = [
    styles.base,
    styles.horizontal,
    horizontalVariantStyles[variant],
    css,
  ];
  return (
    <hr
      ref={setRef}
      role={decorative ? "presentation" : undefined}
      css={composedCss}
      className={className}
      style={style}
    />
  );
}

const styles = stylex.create({
  base: {
    borderWidth: 0,
    borderStyle: "none",
    margin: 0,
    padding: 0,
  },
  horizontal: {
    inlineSize: "100%",
  },
  vertical: {
    blockSize: "100%",
  },
});

const horizontalVariantStyles = stylex.create({
  subtle: {
    blockSize: "1px",
    backgroundColor: color.neutralBorder,
  },
  bold: {
    blockSize: "2px",
    backgroundColor: color.neutralBorder,
  },
  decorative: {
    blockSize: "1px",
    backgroundImage: `linear-gradient(135deg, ${color.accent} 0%, ${color.info} 100%)`,
  },
});

const verticalVariantStyles = stylex.create({
  subtle: {
    inlineSize: "1px",
    backgroundColor: color.neutralBorder,
  },
  bold: {
    inlineSize: "2px",
    backgroundColor: color.neutralBorder,
  },
  decorative: {
    inlineSize: "1px",
    backgroundImage: `linear-gradient(180deg, ${color.accent} 0%, ${color.info} 100%)`,
  },
});
