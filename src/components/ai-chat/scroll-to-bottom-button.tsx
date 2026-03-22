"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import * as stylex from "@stylexjs/stylex";
import { border, color, shadow, space } from "#src/tokens.stylex.ts";

const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

interface ScrollToBottomButtonProps {
  visible: boolean;
  label: string;
  onClick: () => void;
}

export function ScrollToBottomButton({
  visible,
  label,
  onClick,
}: ScrollToBottomButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      css={[styles.button, visible ? styles.visible : styles.hidden]}
    >
      <ArrowDownIcon weight="bold" role="presentation" />
    </button>
  );
}

const styles = stylex.create({
  button: {
    position: "sticky",
    bottom: space._2,
    alignSelf: "center",
    marginTop: "auto",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2rem",
    height: "2rem",
    borderRadius: border.radius_round,
    borderWidth: 0,
    borderStyle: "none",
    appearance: "none",
    cursor: "pointer",
    padding: 0,
    backgroundColor: color.backgroundRaised,
    color: {
      default: color.textMuted,
      ":hover": color.textMain,
    },
    boxShadow: shadow._2,
    transition: {
      default: "opacity 0.2s ease, transform 0.2s ease",
      [REDUCED_MOTION]: "opacity 0.2s ease",
    },
  },
  visible: {
    opacity: 1,
    pointerEvents: "auto",
  },
  hidden: {
    opacity: 0,
    pointerEvents: "none",
  },
});
