import { ComponentProps } from "react";
import * as stylex from "@stylexjs/stylex";
import { tokens } from "../app/tokens.stylex";

export function Button(props: ComponentProps<"button">) {
  return <button {...props} {...stylex.props(styles.button)} />;
}

const styles = stylex.create({
  button: {
    // reset
    borderWidth: "0",
    borderStyle: "none",
    appearance: "none",
    boxSizing: "content-box",
    fontSize: "0.8rem",
    cursor: "pointer",

    // custom styles
    blockSize: "1.5rem",
    borderRadius: "1.5rem",
    paddingVertical: "0.1rem",
    paddingHorizontal: "0.7rem",
    color: tokens.textMain,
    backgroundColor: {
      default: tokens.backgroundRaised,
      ":hover": tokens.backgroundHover,
    },
    boxShadow: tokens.shadowControls,
    display: "inline-flex",
    alignItems: "center",
    transition: "background 0.2s ease",
  },
});
