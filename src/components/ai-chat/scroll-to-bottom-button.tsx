"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "#src/primitives/motion.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, color, shadow, space } from "#src/tokens.stylex.ts";

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
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={onClick}
      css={[
        buttonReset.base,
        styles.button,
        visible ? styles.visible : styles.hidden,
      ]}
    >
      <ArrowDownIcon weight="bold" role="presentation" />
    </button>
  );
}

const styles = stylex.create({
  button: {
    position: "fixed",
    bottom: `calc(${space._10} + env(safe-area-inset-bottom))`,
    left: "50%",
    transform: "translateX(-50%)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2rem",
    height: "2rem",
    borderRadius: border.radius_round,
    padding: 0,
    backgroundColor: color.backgroundRaised,
    color: {
      default: color.textMuted,
      ":hover": color.textMain,
    },
    boxShadow: shadow._2,
    transition: {
      default: "opacity 0.2s ease, transform 0.2s ease",
      [motionConstants.REDUCED_MOTION]: "opacity 0.2s ease",
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
