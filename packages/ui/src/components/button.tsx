"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef, type ComponentProps, type ReactNode } from "react";
import type { StyleProp } from "../css-prop-types.ts";
import { usePressHandlers } from "../hooks/use-press-handlers.ts";
import { a11y } from "../primitives/a11y.stylex.ts";
import { font } from "../tokens.stylex.ts";
import { mergeRefs } from "../utils/merge-refs.ts";
import { sharedStyles } from "./button-shared.stylex.ts";
import { buttonTokens } from "./button.stylex.ts";

interface ButtonBaseProps extends Omit<ComponentProps<"button">, "children"> {
  /** Lifts the button onto a bright surface, brightening further on hover. */
  bright?: boolean;
  /** Below the `md` breakpoint, collapses to the icon and hides the label. */
  hideLabelOnMobile?: boolean;
  /** Decorative leading glyph. Rendered `aria-hidden`; never the accessible name. */
  icon?: ReactNode;
  /**
   * Toggles the active highlight AND emits `aria-pressed` — use for toggle
   * buttons. For a non-toggle CTA that only wants the highlight, use
   * `variant="primary"`.
   */
  isActive?: boolean;
  /**
   * Visual variant. `"primary"` applies the same active highlight style but
   * does NOT emit `aria-pressed` — use it for one-shot CTAs, not toggles.
   */
  variant?: "primary";
  /** Id applied to the label span, e.g. to wire an external `aria-labelledby`. */
  labelId?: string;
  /** StyleX styles merged over the button's own — the config-layer escape hatch. */
  css?: StyleProp;
}

/**
 * A button needs an accessible name (WCAG 4.1.2). When there is no visible
 * `children` to name it, `aria-label` or `aria-labelledby` is required at the
 * type level so icon-only buttons cannot ship unlabelled.
 */
type ButtonProps = ButtonBaseProps &
  (
    | { children: ReactNode }
    | ({ children?: undefined } & (
        | { "aria-label": string; "aria-labelledby"?: undefined }
        | { "aria-labelledby": string; "aria-label"?: undefined }
      ))
  );

export function Button({
  bright,
  children,
  className,
  css,
  disabled,
  hideLabelOnMobile,
  icon,
  isActive,
  labelId,
  ref: forwardedRef,
  style,
  type = "button",
  variant,
  ...restProps
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Keep the internal ref (used by the press-animation hook) and also forward
  // to a caller-supplied ref, which `extends ComponentProps<"button">` allows.
  const setButtonRef = mergeRefs(buttonRef, forwardedRef);

  const { isPressed, releasedOutside, pressedStyle, handlers } =
    usePressHandlers({
      disabled,
      targetRef: buttonRef,
      ...restProps,
    });

  return (
    <button
      aria-pressed={isActive}
      {...restProps}
      ref={setButtonRef}
      type={type}
      className={className}
      disabled={disabled}
      style={{ ...style, ...pressedStyle }}
      css={[
        sharedStyles.base,
        a11y.focusRing,
        styles.button,
        !!icon &&
          !!children &&
          (hideLabelOnMobile
            ? sharedStyles.hasIconHideLabel
            : sharedStyles.hasIcon),
        bright && sharedStyles.bright,
        (isActive || variant === "primary") && sharedStyles.active,
        isPressed && !disabled && sharedStyles.pressed,
        isPressed && !disabled && bright && sharedStyles.pressedBright,
        releasedOutside && sharedStyles.releasedOutside,
        css,
      ]}
      {...handlers}
    >
      {icon && (
        <span css={sharedStyles.icon} aria-hidden>
          {icon}
        </span>
      )}
      {children && (
        <span
          css={[
            sharedStyles.childrenContainer,
            hideLabelOnMobile && sharedStyles.hideLabelOnMobile,
          ]}
          id={labelId}
        >
          {children}
        </span>
      )}
    </button>
  );
}

const styles = stylex.create({
  button: {
    // Button-specific resets
    borderWidth: 0,
    borderStyle: "none",
    appearance: "none",
    fontSize: font.uiControl,
    fontWeight: font.weight_5,
    cursor: { default: "pointer", ":disabled": "not-allowed" },

    // Button-specific styles. Height flows through the shared `buttonTokens`
    // knob so a container (e.g. AnchorButtonGroup) can shrink grouped buttons.
    minHeight: buttonTokens.height,
    color: buttonTokens.color,
    backgroundColor: {
      default: buttonTokens.backgroundColor,
      ":hover": buttonTokens.backgroundColorHover,
      ":disabled:hover": buttonTokens.backgroundColorDisabledHover,
    },
    opacity: {
      default: null,
      ":disabled": 0.7,
    },
  },
});
