import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { border, color, controlSize, font, shadow } from "@/tokens.stylex";

interface ButtonProps extends ComponentProps<"button"> {
  icon?: React.ReactNode;
}

export function Button({
  icon,
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
      css={[styles.button, !!icon && styles.hasIcon]}
    >
      {icon && <span css={styles.icon}>{icon}</span>}
      {children}
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
    color: color.textMain,
    boxShadow: shadow._2,
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
  icon: {
    display: "inline-flex",
  },
});
