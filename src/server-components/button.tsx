import * as stylex from "@stylexjs/stylex";
import type { ComponentProps } from "react";
import { tokens } from "@/tokens.stylex";

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
    <button {...props} className={className} style={style} css={styles.button}>
      {icon && <span css={styles.icon}>{icon}</span>}
      {children}
    </button>
  );
}

const styles = stylex.create({
  button: {
    // Reset
    borderWidth: "0",
    borderStyle: "none",
    appearance: "none",
    boxSizing: "content-box",
    fontSize: "16px",
    fontWeight: 400,
    cursor: { default: "pointer", ":disabled": "not-allowed" },

    // Custom styles
    display: "inline-flex",
    alignItems: "center",
    blockSize: "36px",
    borderRadius: "36px",
    paddingBlock: "2px",
    paddingInline: "16px",
    color: tokens.textMain,
    backgroundColor: {
      default: tokens.backgroundRaised,
      ":hover": tokens.backgroundHover,
      ":disabled:hover": tokens.backgroundRaised,
    },
    opacity: {
      default: null,
      ":disabled": 0.7,
    },
    boxShadow: tokens.shadowControls,
    transition: "background 0.2s ease",
  },
  hasIcon: {
    paddingLeft: "8px",
  },
  icon: {
    display: "inline-flex",
    marginRight: "8px",
  },
});
