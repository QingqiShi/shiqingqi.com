import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { border, color, font, shadow, size } from "@/tokens.stylex";

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
    fontSize: font.size_0,
    fontWeight: font.weight_5,
    cursor: { default: "pointer", ":disabled": "not-allowed" },

    // Custom styles
    display: "inline-flex",
    alignItems: "center",
    gap: size._1,
    height: size._7,
    paddingBlock: size._0,
    paddingInline: size._3,
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
    paddingLeft: size._1,
  },
  icon: {
    display: "inline-flex",
  },
});
