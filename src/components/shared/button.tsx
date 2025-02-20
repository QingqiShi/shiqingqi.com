import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { breakpoints } from "@/breakpoints";
import { border, controlSize, font, shadow } from "@/tokens.stylex";
import { buttonTokens } from "./button.stylex";

interface ButtonProps extends ComponentProps<"button"> {
  icon?: React.ReactNode;
  hideLabelOnMobile?: boolean;
  labelId?: string;
}

export function Button({
  icon,
  hideLabelOnMobile,
  labelId,
  children,
  className,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={className}
      style={style}
      css={[styles.button, !!icon && !hideLabelOnMobile && styles.hasIcon]}
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
    height: controlSize._9,
    paddingBlock: controlSize._1,
    paddingInline: controlSize._3,
    borderRadius: border.radius_round,
    color: buttonTokens.color,
    boxShadow: shadow._2,
    transition: "background 0.2s ease",
    backgroundColor: buttonTokens.backgroundColor,
    opacity: {
      default: null,
      ":disabled": 0.7,
    },
  },
  hasIcon: {
    paddingLeft: controlSize._2,
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
});
