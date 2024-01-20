import type { ComponentProps } from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../tokens.stylex";
import type { StyleProp } from "../types";

interface ButtonProps
  extends Omit<ComponentProps<"button">, "className" | "style"> {
  style?: StyleProp;
}

export function Button({ style, ...props }: ButtonProps) {
  return <button {...props} {...stylex.props(styles.button, style)} />;
}

const styles = stylex.create({
  button: {
    // Reset
    borderWidth: "0",
    borderStyle: "none",
    appearance: "none",
    boxSizing: "content-box",
    fontSize: "0.8rem",
    cursor: { default: "pointer", ":disabled": "not-allowed" },

    // Custom styles
    blockSize: "1.5rem",
    borderRadius: "1.5rem",
    paddingVertical: "0.1rem",
    paddingHorizontal: "0.7rem",
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
    display: "inline-flex",
    alignItems: "center",
    transition: "background 0.2s ease",
  },
});
