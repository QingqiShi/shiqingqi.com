"use client";

import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import { usePressHandlers } from "#src/hooks/use-press-handlers.ts";
import { controlSize } from "#src/tokens.stylex.ts";
import { Anchor } from "./anchor";
import { anchorTokens } from "./anchor.stylex";
import { sharedStyles } from "./button-shared.stylex";
import { buttonTokens } from "./button.stylex";

interface AnchorButtonProps extends React.ComponentProps<typeof Anchor> {
  bright?: boolean;
  hideLabelOnMobile?: boolean;
  icon?: React.ReactNode;
  isActive?: boolean;
}

export function AnchorButton({
  bright,
  children,
  className,
  hideLabelOnMobile,
  icon,
  isActive,
  style,
  ...restProps
}: AnchorButtonProps) {
  const anchorRef = useRef<HTMLAnchorElement>(null);

  const { isPressed, releasedOutside, pressedStyle, handlers } =
    usePressHandlers({
      targetRef: anchorRef,
      ...restProps,
    });

  return (
    <Anchor
      {...restProps}
      ref={anchorRef}
      className={className}
      style={{ ...style, ...pressedStyle }}
      css={[
        sharedStyles.base,
        styles.anchorButton,
        !!icon &&
          !!children &&
          (hideLabelOnMobile
            ? sharedStyles.hasIconHideLabel
            : sharedStyles.hasIcon),
        bright && sharedStyles.bright,
        isActive && sharedStyles.active,
        isPressed && sharedStyles.pressed,
        isPressed && bright && sharedStyles.pressedBright,
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
        >
          {children}
        </span>
      )}
    </Anchor>
  );
}

const styles = stylex.create({
  anchorButton: {
    // Anchor-specific resets
    fontSize: controlSize._4,
    textDecoration: "none",
    cursor: "pointer",

    // Anchor-specific styles
    height: buttonTokens.height,
    [anchorTokens.color]: buttonTokens.color,
  },
});
