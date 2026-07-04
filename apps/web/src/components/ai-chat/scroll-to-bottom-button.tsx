"use client";

import { ArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import * as stylex from "@stylexjs/stylex";
import { IconButton } from "@tuja/ui/components/icon-button";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { space } from "@tuja/ui/tokens.stylex";

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
    <IconButton
      icon={<ArrowDownIcon weight="bold" />}
      aria-label={label}
      variant="surface"
      inert={!visible}
      onClick={onClick}
      css={[styles.button, visible ? styles.visible : styles.hidden]}
    />
  );
}

const styles = stylex.create({
  button: {
    position: "absolute",
    bottom: `calc(100% + ${space._2})`,
    left: "50%",
    transform: "translateX(-50%)",
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
