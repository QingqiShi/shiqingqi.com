import * as stylex from "@stylexjs/stylex";
import type { ComponentProps, ReactNode } from "react";
import { a11y } from "../../primitives/a11y.stylex.ts";
import { corner } from "../../primitives/corner.stylex.ts";
import { flex } from "../../primitives/flex.stylex.ts";
import { transition } from "../../primitives/motion.stylex.ts";
import { buttonReset } from "../../primitives/reset.stylex.ts";
import type { StyleProp } from "../../style-prop.ts";
import {
  color,
  controlSize,
  font,
  opacity,
  shadow,
} from "../../tokens.stylex.ts";

type IconButtonSize = "sm" | "md" | "lg";
type IconButtonVariant = "plain" | "surface";
type IconButtonShape = "circle" | "square";

interface IconButtonBaseProps extends Omit<
  ComponentProps<"button">,
  "children" | "className" | "style"
> {
  /**
   * Icon to render. Rendered inside an `aria-hidden` wrapper — it is purely
   * decorative, so the button's accessible name must come from `aria-label` /
   * `aria-labelledby`, never the icon.
   */
  icon: ReactNode;
  /**
   * Diameter scale via `controlSize`. Defaults to `"md"`.
   *
   * `"sm"` still falls short of the 44px WCAG 2.5.8 touch target, even though
   * every size grows on touch viewports.
   */
  size?: IconButtonSize;
  /**
   * `"plain"` tints on hover, for an affordance inline over an existing
   * surface. `"surface"` adds an opaque fill and shadow, for a floating
   * control (e.g. a carousel arrow) over content. Defaults to `"plain"`.
   */
  variant?: IconButtonVariant;
  /** `"circle"` (fully rounded) or `"square"` (rounded corners). Defaults to `"circle"`. */
  shape?: IconButtonShape;
  /** StyleX styles merged over the button's own — the config-layer escape hatch, composed last. */
  css?: StyleProp;
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
 * A compact, icon-only button. Forwards native button attributes, so
 * positioning and show/hide behaviour stay with the caller.
 */
export function IconButton({
  icon,
  size = "md",
  variant = "plain",
  shape = "circle",
  type = "button",
  css,
  ref,
  ...restProps
}: IconButtonProps) {
  return (
    <button
      {...restProps}
      ref={ref}
      type={type}
      css={[
        buttonReset.base,
        flex.center,
        transition.colors,
        a11y.focusRing,
        styles.base,
        sizeStyles[size],
        shapeCornerStyles[shape],
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
    opacity: { default: null, ":disabled": opacity.disabled },
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

// `circle`/`square` have no styling of their own, so they map straight to the
// `corner` primitive instead of an empty `stylex.create` entry.
const shapeCornerStyles = {
  circle: corner.radius_round,
  square: corner.radius_2,
};

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
