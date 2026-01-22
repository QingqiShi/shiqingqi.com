import * as stylex from "@stylexjs/stylex";
import { useRef, type ComponentProps } from "react";
import { usePressHandlers } from "#src/hooks/use-press-handlers.ts";
import { controlSize, font } from "#src/tokens.stylex.ts";
import { sharedStyles } from "./button-shared.stylex";
import { buttonTokens } from "./button.stylex";

interface ButtonProps extends ComponentProps<"button"> {
  bright?: boolean;
  hideLabelOnMobile?: boolean;
  icon?: React.ReactNode;
  isActive?: boolean;
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
  style,
  ...restProps
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { isPressed, releasedOutside, pressedStyle, handlers } =
    usePressHandlers({
      disabled,
      targetRef: buttonRef,
      ...restProps,
    });

  return (
    <button
      {...restProps}
      ref={buttonRef}
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
        isActive && sharedStyles.active,
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
