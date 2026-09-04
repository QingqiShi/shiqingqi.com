import type { Icon } from "@phosphor-icons/react";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CaretUpIcon } from "@phosphor-icons/react/dist/ssr/CaretUp";
import * as stylex from "@stylexjs/stylex";
import {
  absoluteFill,
  pointerConstants,
} from "../../primitives/layout.stylex.ts";
import { transition } from "../../primitives/motion.stylex.ts";
import type { StyleProp } from "../../style-prop.ts";
import { space } from "../../tokens.stylex.ts";
import { Button } from "../actions/button.tsx";

/**
 * The edge of a region a scroll button scrolls towards.
 *
 * @internal
 */
export type ScrollButtonEdge =
  "block-start" | "block-end" | "inline-start" | "inline-end";

interface ScrollButtonProps {
  /** The edge this button scrolls the region towards. */
  edge: ScrollButtonEdge;
  /** Accessible name for the button. */
  label: string;
  /** Whether this button's own edge currently masks. */
  isShown: boolean;
  onClick: () => void;
}

/**
 * One `ScrollMask` scroll button, pinned to its edge and shown only while that
 * edge masks.
 *
 * @internal
 */
export function ScrollButton({
  edge,
  label,
  isShown,
  onClick,
}: ScrollButtonProps) {
  const { fill, position, Icon } = scrollButtonEdges[edge];
  return (
    <Button
      size="sm"
      icon={<Icon weight="bold" />}
      aria-label={label}
      inert={!isShown}
      onClick={onClick}
      css={[
        transition.opacity,
        fill,
        styles.scrollButton,
        position,
        isShown ? styles.scrollButtonShown : styles.scrollButtonHidden,
      ]}
    />
  );
}

const styles = stylex.create({
  // Painted after the bands in DOM order, so the blur can't cover it. Hidden
  // on touch, where a swipe already scrolls the region and the button would
  // only sit on top of content.
  scrollButton: {
    zIndex: 1,
    display: {
      default: "none",
      [pointerConstants.NON_TOUCH_DEVICE]: "flex",
    },
  },
  // Centred via `auto` margins between `absoluteFill`'s two insets, so the
  // button's own `transform` stays free for its press animation.
  scrollButtonInlineStart: {
    insetInlineStart: space._3,
    marginBlock: "auto",
  },
  scrollButtonInlineEnd: {
    insetInlineEnd: space._3,
    marginBlock: "auto",
  },
  scrollButtonBlockStart: {
    insetBlockStart: space._3,
    marginInline: "auto",
  },
  scrollButtonBlockEnd: {
    insetBlockEnd: space._3,
    marginInline: "auto",
  },
  scrollButtonShown: {
    opacity: 1,
    pointerEvents: "auto",
  },
  scrollButtonHidden: {
    opacity: 0,
    pointerEvents: "none",
  },
});

const scrollButtonEdges: Record<
  ScrollButtonEdge,
  { fill: StyleProp; position: StyleProp; Icon: Icon }
> = {
  "block-start": {
    fill: absoluteFill.x,
    position: styles.scrollButtonBlockStart,
    Icon: CaretUpIcon,
  },
  "block-end": {
    fill: absoluteFill.x,
    position: styles.scrollButtonBlockEnd,
    Icon: CaretDownIcon,
  },
  "inline-start": {
    fill: absoluteFill.y,
    position: styles.scrollButtonInlineStart,
    Icon: CaretLeftIcon,
  },
  "inline-end": {
    fill: absoluteFill.y,
    position: styles.scrollButtonInlineEnd,
    Icon: CaretRightIcon,
  },
};
