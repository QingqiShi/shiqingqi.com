"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { IconButton } from "@tuja/ui/components/icon-button";
import { motionConstants } from "@tuja/ui/primitives/motion.stylex";
import { layer } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
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
      <IconButton
        icon={<CaretLeftIcon weight="bold" />}
        aria-label={t({ en: "Scroll left", zh: "向左滚动" })}
        variant="surface"
        inert={!showLeft}
        onClick={() => {
          scroll(-1);
        }}
        css={[
          styles.button,
          showLeft ? styles.visible : styles.hidden,
          leftCss,
        ]}
      />
      <IconButton
        icon={<CaretRightIcon weight="bold" />}
        aria-label={t({ en: "Scroll right", zh: "向右滚动" })}
        variant="surface"
        inert={!showRight}
        onClick={() => {
          scroll(1);
        }}
        css={[
          styles.button,
          showRight ? styles.visible : styles.hidden,
          rightCss,
        ]}
      />
    </>
  );
}

const styles = stylex.create({
  button: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: layer.content,
    display: {
      default: "inline-flex",
      [HOVER_NONE]: "none",
    },
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
