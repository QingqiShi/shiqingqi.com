"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { motionConstants } from "#src/primitives/motion.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, color, shadow } from "#src/tokens.stylex.ts";
import { getScrollBehavior } from "#src/utils/get-scroll-behavior.ts";

const HOVER_NONE = "@media (hover: none)";

interface HorizontalScrollButtonsProps {
  scrollRef: React.RefObject<HTMLElement | null>;
  showLeft: boolean;
  showRight: boolean;
  leftCss?: React.Attributes["css"];
  rightCss?: React.Attributes["css"];
}

export function HorizontalScrollButtons({
  scrollRef,
  showLeft,
  showRight,
  leftCss,
  rightCss,
}: HorizontalScrollButtonsProps) {
  const scroll = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth,
      behavior: getScrollBehavior(),
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label={t({ en: "Scroll left", zh: "向左滚动" })}
        inert={!showLeft}
        onClick={() => {
          scroll(-1);
        }}
        css={[
          buttonReset.base,
          styles.button,
          showLeft ? styles.visible : styles.hidden,
          leftCss,
        ]}
      >
        <CaretLeftIcon weight="bold" role="presentation" />
      </button>
      <button
        type="button"
        aria-label={t({ en: "Scroll right", zh: "向右滚动" })}
        inert={!showRight}
        onClick={() => {
          scroll(1);
        }}
        css={[
          buttonReset.base,
          styles.button,
          showRight ? styles.visible : styles.hidden,
          rightCss,
        ]}
      >
        <CaretRightIcon weight="bold" role="presentation" />
      </button>
    </>
  );
}

const styles = stylex.create({
  button: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 1,
    display: {
      default: "inline-flex",
      [HOVER_NONE]: "none",
    },
    alignItems: "center",
    justifyContent: "center",
    width: "2rem",
    height: "2rem",
    borderRadius: border.radius_round,
    backgroundColor: color.backgroundRaised,
    color: {
      default: color.textMuted,
      ":hover": color.textMain,
    },
    boxShadow: shadow._2,
    transition: {
      default: "opacity 0.2s ease",
      [motionConstants.REDUCED_MOTION]: "none",
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
