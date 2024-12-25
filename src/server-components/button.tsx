import type { ComponentProps } from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../tokens.stylex";
import type { StyleProp } from "../types";

interface ButtonProps
  extends Omit<ComponentProps<"button">, "className" | "style"> {
  icon?: React.ReactNode;
  style?: StyleProp;
}

export function Button({ icon, style, children, ...props }: ButtonProps) {
  return (
    <button {...props} {...stylex.props(styles.button, style)}>
      {icon && <span {...stylex.props(styles.icon)}>{icon}</span>}
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
