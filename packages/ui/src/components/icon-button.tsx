import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { a11y } from "../primitives/a11y.stylex.ts";
import { flex } from "../primitives/flex.stylex.ts";
import { transition } from "../primitives/motion.stylex.ts";
import { buttonReset } from "../primitives/reset.stylex.ts";
import { border, color, controlSize, font, shadow } from "../tokens.stylex.ts";

type IconButtonSize = "sm" | "md" | "lg";
type IconButtonVariant = "plain" | "surface";
type IconButtonShape = "circle" | "square";

interface IconButtonBaseProps extends Omit<
  ComponentProps<"button">,
  "children"
> {
  /**
   * Glyph to render. Rendered inside an `aria-hidden` wrapper — it is purely
   * decorative, so the button's accessible name must come from `aria-label` /
   * `aria-labelledby`, never the icon.
   */
  icon: ReactNode;
  /**
   * Diameter ramp, sized via `controlSize`. Defaults to `"md"`. On touch
   * viewports every size renders larger (the `controlSize` tokens scale up
   * below the `md` breakpoint); `"md"`/`"lg"` clear the 44px WCAG 2.5.8 target
   * there, while `"sm"` is best reserved for pointer-dense desktop toolbars.
   */
  size?: IconButtonSize;
  /**
   * `"plain"` is a transparent affordance that tints its background on hover —
   * use it inline, over an existing surface. `"surface"` adds an opaque surface
   * fill and a drop shadow so the button reads as a floating control (e.g. a
   * scroll-to-bottom or carousel arrow overlaid on scrolling content).
   * Defaults to `"plain"`.
   */
  variant?: IconButtonVariant;
  /** `"circle"` (fully rounded) or `"square"` (rounded corners). Defaults to `"circle"`. */
  shape?: IconButtonShape;
  /** StyleX styles merged over the button's own — the config-layer escape hatch, composed last. */
  css?: StyleXStyles;
}

/**
 * An icon-only button needs an accessible name (WCAG 4.1.2). Since it never has
 * visible text, `aria-label` or `aria-labelledby` is required at the type level
 * so an unlabelled icon button cannot ship.
 */
type IconButtonLabelProps =
  | {
      /** Accessible name for the button. */
      "aria-label": string;
      "aria-labelledby"?: undefined;
    }
  | {
      "aria-label"?: undefined;
      /** Id of a visible element that names the button. */
      "aria-labelledby": string;
    };

type IconButtonProps = IconButtonBaseProps & IconButtonLabelProps;

/**
 * A compact, icon-only button. Renders a single `<button>` and forwards native
 * button attributes (`onClick`, `disabled`, `inert`, `className`, `style`,
 * `ref`, `type`, `data-*`, …), so positioning and show/hide behaviour stay with
 * the caller. Stateless and server-renderable; the `css` prop is composed last
 * so a caller can override any default (e.g. absolute positioning).
 */
export function IconButton({
  icon,
  size = "md",
  variant = "plain",
  shape = "circle",
  type = "button",
  className,
  style,
  css,
  ref,
  ...restProps
}: IconButtonProps) {
  return (
    <button
      {...restProps}
      ref={ref}
      type={type}
      className={className}
      style={style}
      css={[
        buttonReset.base,
        flex.center,
        transition.colors,
        a11y.focusRing,
        styles.base,
        sizeStyles[size],
        shapeStyles[shape],
        variantStyles[variant],
        css,
      ]}
    >
      <span css={styles.icon} aria-hidden>
        {icon}
      </span>
    </button>
  );
}

const styles = stylex.create({
  base: {
    flexShrink: 0,
    color: {
      default: color.textMuted,
      ":hover": color.textMain,
      ":disabled:hover": color.textMuted,
    },
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: null, ":disabled": 0.7 },
  },
  icon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "1em",
    blockSize: "1em",
  },
});

const sizeStyles = stylex.create({
  sm: {
    inlineSize: controlSize._7,
    blockSize: controlSize._7,
    fontSize: font.uiBodySmall,
  },
  md: {
    inlineSize: controlSize._8,
    blockSize: controlSize._8,
    fontSize: font.uiBody,
  },
  lg: {
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
    fontSize: font.uiHeading2,
  },
});

const shapeStyles = stylex.create({
  circle: { borderRadius: border.radius_round },
  square: { borderRadius: border.radius_2 },
});

const variantStyles = stylex.create({
  plain: {
    backgroundColor: {
      default: "transparent",
      ":hover": color.bgInteractiveHover,
      ":disabled:hover": "transparent",
    },
  },
  surface: {
    backgroundColor: color.bgSurface,
    boxShadow: shadow._2,
  },
});
