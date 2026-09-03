import * as stylex from "@stylexjs/stylex";
import type { Ref } from "react";
import type { StyleProp } from "../../style-prop.ts";
import { border, color } from "../../tokens.stylex.ts";
import { mergeRefs } from "../../utils/merge-refs.ts";

type DividerOrientation = "horizontal" | "vertical";
type DividerVariant = "subtle" | "bold" | "decorative";

interface DividerProps {
  /** Line direction. Defaults to `"horizontal"`. */
  orientation?: DividerOrientation;
  /** Weight / treatment of the rule. Defaults to `"subtle"`. */
  variant?: DividerVariant;
  /** StyleX overrides, composed last so a caller can win over the defaults. */
  css?: StyleProp;
  /** Ref to the rendered element (`<hr>` when horizontal, `<div>` when vertical). */
  ref?: Ref<HTMLElement>;
}

/**
 * Thin separator rule: a semantic `<hr>` when horizontal, or a
 * `role="separator"` `<div>` when vertical, since an `<hr>` cannot be turned
 * on its side accessibly.
 */
export function Divider({
  orientation = "horizontal",
  variant = "subtle",
  css,
  ref,
}: DividerProps) {
  // Merges into one callback ref: `<hr>`/`<div>` share `HTMLElement` but not a
  // concrete ref type. `mergeRefs` returns `undefined` with no ref, so nothing
  // attaches during a Server Component render, where attaching any ref is
  // illegal.
  const setRef = mergeRefs(ref);

  // The `decorative` variant is an ornamental flourish, not a content
  // boundary, so it opts out of the `separator` role.
  const decorative = variant === "decorative";

  if (orientation === "vertical") {
    return (
      <div
        role={decorative ? "presentation" : "separator"}
        aria-orientation={decorative ? undefined : "vertical"}
        ref={setRef}
        css={[
          styles.base,
          styles.vertical,
          verticalVariantStyles[variant],
          css,
        ]}
      />
    );
  }

  return (
    <hr
      ref={setRef}
      role={decorative ? "presentation" : undefined}
      css={[
        styles.base,
        styles.horizontal,
        horizontalVariantStyles[variant],
        css,
      ]}
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
    blockSize: border.size_1,
    backgroundColor: color.neutralBorder,
  },
  bold: {
    blockSize: border.size_2,
    backgroundColor: color.neutralBorder,
  },
  decorative: {
    blockSize: border.size_1,
    backgroundImage: `linear-gradient(135deg, ${color.accent} 0%, ${color.info} 100%)`,
  },
});

const verticalVariantStyles = stylex.create({
  subtle: {
    inlineSize: border.size_1,
    backgroundColor: color.neutralBorder,
  },
  bold: {
    inlineSize: border.size_2,
    backgroundColor: color.neutralBorder,
  },
  decorative: {
    inlineSize: border.size_1,
    backgroundImage: `linear-gradient(180deg, ${color.accent} 0%, ${color.info} 100%)`,
  },
});
