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
  /** Below this breakpoint, collapses to the icon and hides the label. */
  hideLabelBelow?: "md" | "lg";
  icon?: React.ReactNode;
  isActive?: boolean;
}

export function AnchorButton({
  bright,
  children,
  hideLabelBelow,
  icon,
  isActive,
  ref: forwardedRef,
  css,
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

  const { isPressed, releasedOutside, pressedCss, handlers } = usePressHandlers(
    {
      targetRef: anchorRef,
      ...restProps,
    },
  );

  return (
    <Anchor
      aria-current={isActive ? "true" : undefined}
      {...restProps}
      indicateExternal={false}
      ref={setAnchorRef}
      css={[
        sharedStyles.base,
        styles.anchorButton,
        !!icon && !!children && hasIconStyles[hideLabelBelow ?? "never"],
        bright && sharedStyles.bright,
        isActive && sharedStyles.active,
        isPressed && sharedStyles.pressed,
        isPressed && bright && sharedStyles.pressedBright,
        releasedOutside && sharedStyles.releasedOutside,
        pressedCss,
        css,
      ]}
      {...handlers}
    >
      {icon && <span css={sharedStyles.icon}>{icon}</span>}
      {children && (
        <span
          css={[
            sharedStyles.childrenContainer,
            hideLabelBelow && hideLabelStyles[hideLabelBelow],
          ]}
        >
          {children}
        </span>
      )}
    </Anchor>
  );
}

const hasIconStyles = {
  never: sharedStyles.hasIcon,
  md: sharedStyles.hasIconHideLabelBelowMd,
  lg: sharedStyles.hasIconHideLabelBelowLg,
};

const hideLabelStyles = {
  md: sharedStyles.hideLabelBelowMd,
  lg: sharedStyles.hideLabelBelowLg,
};

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
