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
    fontSize: "19px",
    cursor: { default: "pointer", ":disabled": "not-allowed" },

    // Custom styles
    blockSize: "36px",
    borderRadius: "36px",
    paddingVertical: "2.4px",
    paddingHorizontal: "16.8px",
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
