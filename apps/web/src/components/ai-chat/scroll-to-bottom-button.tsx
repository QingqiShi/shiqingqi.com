"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import * as stylex from "@stylexjs/stylex";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { border, color, shadow, space } from "@tuja/ui/tokens.stylex";

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
      inert={!visible}
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
    position: "absolute",
    bottom: `calc(100% + ${space._2})`,
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
