import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import {
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import Image, { type StaticImageData } from "next/image";
import { tileMarker } from "#src/design-system/overview-tile.stylex.ts";
import { illoVars } from "./illustration.stylex.ts";

const MAX_INLINE_SIZE = 128;
/**
 * A tile narrower than `WIDE_TILE` can wrap its description to a third line,
 * so its art stays short enough to clear that line.
 */
const BLOCK_SIZE = { narrow: 72, wide: 86 };
const WIDE_TILE = "@container (min-width: 340px)";
const LEAN = { x: 6, y: 3 };
const ENGAGED_SCALE = 1.12;

export type FoundationIllustrationArt = {
  src: StaticImageData;
  /** The card edge that the art runs off, so its flat cut edge sits on that edge. */
  bleeds?: "inline-end" | "block-end";
};

/**
 * A foundation card's render, held bottom-right in one fixed box so renders of
 * different shapes read as one set. At rest it is drained to greyscale and
 * held back; engaging the tile brings back its colour and leans it towards the
 * pointer.
 */
export function FoundationIllustration({
  src,
  bleeds,
}: FoundationIllustrationArt) {
  const inlineSize = (blockSize: number) =>
    String(
      Math.min(
        MAX_INLINE_SIZE,
        Math.ceil((blockSize * src.width) / src.height),
      ),
    );
  return (
    <Image
      src={src}
      alt=""
      // A phone shows one wide tile per row. Wider screens mostly show narrow
      // tiles, so a wide tile there gets a little less than 2x.
      sizes={`(max-width: 767px) ${inlineSize(BLOCK_SIZE.wide)}px, ${inlineSize(BLOCK_SIZE.narrow)}px`}
      {...stylex.props(
        styles.art,
        bleeds === "inline-end" && styles.bleedsInlineEnd,
        bleeds === "block-end" && styles.bleedsBlockEnd,
      )}
    />
  );
}

const styles = stylex.create({
  art: {
    position: "absolute",
    insetInlineEnd: space._1,
    insetBlockEnd: space._0,
    inlineSize: `${String(MAX_INLINE_SIZE)}px`,
    blockSize: {
      default: `${String(BLOCK_SIZE.narrow)}px`,
      [WIDE_TILE]: `${String(BLOCK_SIZE.wide)}px`,
    },
    objectFit: "contain",
    objectPosition: "right bottom",
    filter: {
      default: "grayscale(1) brightness(0.8) contrast(1.15)",
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        "grayscale(0) brightness(1) contrast(1)",
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]:
          "grayscale(0) brightness(1) contrast(1)",
      },
    },
    opacity: {
      default: 0.6,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]: 1,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: 1,
      },
    },
    transform: {
      default: `translate(calc(${illoVars.mx} * ${String(LEAN.x)}px), calc(${illoVars.my} * ${String(LEAN.y)}px))`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    transformOrigin: "right bottom",
    scale: {
      default: 1,
      [stylex.when.ancestor(":is(:focus-within, :active)", tileMarker)]:
        ENGAGED_SCALE,
      [pointer.canHover]: {
        default: null,
        [stylex.when.ancestor(":hover", tileMarker)]: ENGAGED_SCALE,
      },
      [motionConstants.REDUCED_MOTION]: 1,
    },
    transition: {
      default: `opacity ${duration._500} ${easing.ease}, filter ${duration._500} ${easing.ease}, transform ${duration._500} ${easing.spring}, scale ${duration._500} ${easing.spring}`,
      [motionConstants.REDUCED_MOTION]: `opacity ${duration._500} ${easing.ease}, filter ${duration._500} ${easing.ease}`,
    },
  },
  // The art starts past the edge it bleeds off by the lean distance, and the
  // layer clips that part. Thus the lean cannot open a gap between the cut edge
  // and the card edge.
  bleedsInlineEnd: {
    insetInlineEnd: `-${String(LEAN.x)}px`,
  },
  bleedsBlockEnd: {
    insetBlockEnd: `-${String(LEAN.y)}px`,
  },
});
