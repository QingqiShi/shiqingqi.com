import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { breakpoints } from "@/breakpoints";
import { color, controlSize, font } from "@/tokens.stylex";
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
  hideLabelOnMobile,
  icon,
  isActive,
  labelId,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={className}
      style={style}
      css={[
        styles.button,
        !!icon &&
          !!children &&
          (hideLabelOnMobile ? styles.hasIconHideLabel : styles.hasIcon),
        bright && styles.bright,
        isActive && styles.active,
      ]}
    >
      {icon && <span css={styles.icon}>{icon}</span>}
      {children && (
        <span
          css={[
            styles.childrenContainer,
            hideLabelOnMobile && styles.hideLabelOnMobile,
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
    // Reset
    borderWidth: 0,
    borderStyle: "none",
    appearance: "none",
    fontSize: controlSize._4,
    fontWeight: font.weight_5,
    cursor: { default: "pointer", ":disabled": "not-allowed" },

    // Custom styles
    display: "inline-flex",
    alignItems: "center",
    gap: controlSize._2,
    minHeight: controlSize._9,
    paddingBlock: controlSize._1,
    paddingInline: controlSize._3,
    borderRadius: buttonTokens.borderRadius,
    color: buttonTokens.color,
    boxShadow: buttonTokens.boxShadow,
    transition: "background 0.2s ease",
    backgroundColor: {
      default: color.backgroundRaised,
      ":hover": color.backgroundHover,
      ":disabled:hover": color.backgroundRaised,
    },
    opacity: {
      default: null,
      ":disabled": 0.7,
    },
  },
  hasIcon: {
    paddingLeft: controlSize._2,
  },
  hasIconHideLabel: {
    paddingLeft: { default: controlSize._3, [breakpoints.md]: controlSize._2 },
  },
  icon: {
    display: "inline-flex",
  },
  childrenContainer: {
    display: "inline-flex",
    alignItems: "center",
    gap: controlSize._2,
  },
  hideLabelOnMobile: {
    display: { default: "none", [breakpoints.md]: "inline-flex" },
  },
  active: {
    [buttonTokens.color]: {
      default: color.textOnActive,
      ":hover": color.textOnActive,
    },
    backgroundColor: {
      default: color.controlActive,
      ":hover": color.controlActiveHover,
      ":disabled:hover": color.controlActive,
    },
  },
  bright: {
    backgroundColor: color.controlThumb,
    [buttonTokens.color]: color.textOnControlThumb,
    filter: {
      ":hover": "brightness(1.1)",
    },
  },
});
