import * as stylex from "@stylexjs/stylex";
import { useRef, type ComponentProps } from "react";
import { usePressHandlers } from "../hooks/use-press-handlers.ts";
import { controlSize, font } from "../tokens.stylex.ts";
import { sharedStyles } from "./button-shared.stylex.ts";
import { buttonTokens } from "./button.stylex.ts";

interface ButtonProps extends ComponentProps<"button"> {
  bright?: boolean;
  hideLabelOnMobile?: boolean;
  icon?: React.ReactNode;
  isActive?: boolean;
  /**
   * Visual variant. `"primary"` applies the same active highlight style but
   * does NOT emit `aria-pressed` — use it for one-shot CTAs, not toggles.
   */
  variant?: "primary";
  labelId?: string;
}

export function Button({
  bright,
  children,
  className,
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
  const setButtonRef = (node: HTMLButtonElement | null) => {
    buttonRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

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
      ]}
      {...handlers}
    >
      {icon && <span css={sharedStyles.icon}>{icon}</span>}
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
    fontSize: controlSize._4,
    fontWeight: font.weight_5,
    cursor: { default: "pointer", ":disabled": "not-allowed" },

    // Button-specific styles
    minHeight: controlSize._9,
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
