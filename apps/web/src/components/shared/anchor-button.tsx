"use client";

import * as stylex from "@stylexjs/stylex";
import { anchorTokens } from "@tuja/ui/components/anchor.stylex";
import { sharedStyles } from "@tuja/ui/components/button-shared.stylex";
import { buttonTokens } from "@tuja/ui/components/button.stylex";
import { usePressHandlers } from "@tuja/ui/hooks/use-press-handlers";
import { controlSize } from "@tuja/ui/tokens.stylex";
import { useRef } from "react";
import { Anchor } from "./anchor";

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
  ref: forwardedRef,
  style,
  ...restProps
}: AnchorButtonProps) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  // Keep the internal ref (used by the press-animation hook) and also forward
  // to a caller-supplied ref, which `extends ComponentProps<typeof Anchor>`
  // allows.
  const setAnchorRef = (node: HTMLAnchorElement | null) => {
    anchorRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  const { isPressed, releasedOutside, pressedStyle, handlers } =
    usePressHandlers({
      targetRef: anchorRef,
      ...restProps,
    });

  return (
    <Anchor
      aria-current={isActive ? "true" : undefined}
      {...restProps}
      indicateExternal={false}
      ref={setAnchorRef}
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
