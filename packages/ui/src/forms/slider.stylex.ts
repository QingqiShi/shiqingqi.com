import * as stylex from "@stylexjs/stylex";
import { color } from "../color.stylex.ts";
import { cornerTokens } from "../primitives/corner.stylex.ts";
import {
  duration,
  easing,
  motionConstants,
} from "../primitives/motion.stylex.ts";
import {
  border,
  controlHeight,
  controlSize,
  shadow,
  font,
  opacity,
} from "../tokens.stylex.ts";

/**
 * The state of a Slider's motion, which its motion engine writes on the
 * control each frame, and the sizes that its `size` variants set.
 *
 * @internal
 */
export const sliderVars = stylex.defineVars({
  // Where the panel is, as a share of the range, from 0 to 1.
  fraction: "0",
  // How far the value has moved from the end of the groove onto the panel,
  // and how far through that climb it is, from 0 to 1.
  valueX: "0px",
  climb: "0",
  // How far the label has moved off the panel, into the groove.
  labelX: "0px",
  // Where the middle of the handle is, from the left of the groove's inside.
  handleX: "1e5px",
  // The move and the stretch of each piece of the handle's line.
  topY: "0px",
  topScale: "1",
  bottomY: "0px",
  bottomScale: "1",
  // How far the panel has melted into liquid, from 0 to 1.
  melt: "0",
  // The `size` variants set these; every other length derives from them.
  height: controlHeight.md,
  pad: controlSize._4,
  handleWidth: "3px",
});

/**
 * Marks a Slider's control, so its parts can follow its press.
 *
 * @internal
 */
export const sliderMarker = stylex.defineMarker();

/**
 * Marks a Slider's groove, so its panel can fade while the effect layer
 * draws it as liquid.
 *
 * @internal
 */
export const sliderGrooveMarker = stylex.defineMarker();

const DRAWN_BY_EFFECT = ":is([data-effect-drawn])";

/** The groove's inside, from the outside of its border to the inside of its padding. */
const INSET = `calc(${border.size_1} + ${controlSize._0})`;
/** The panel's far edge at the low end: a panel as long as it is tall. */
const MIN_EDGE = `calc(${sliderVars.height} - 2 * ${INSET})`;
/** The room the far edge has to travel, in a box as wide as the groove's inside. */
const TRAVEL = `(100% - ${MIN_EDGE})`;
const HANDLE_LENGTH = `calc(${MIN_EDGE} * 0.42)`;
const HALF_HANDLE = `calc(${sliderVars.handleWidth} / 2)`;
/** How much of the panel's text shows at the handle, and how far before it the fade starts. */
const TEXT_AT_HANDLE = 0.18;
const TEXT_FADE = "2.5em";
/**
 * The end of the panel's cap, in the px of the panel. Away from its edges
 * the panel starts 1px before it, so no seam shows; at its edges and outside
 * it, the panel starts at it, so their edges and shadows do not overlap.
 */
const CAP_END = `calc((1 - ${sliderVars.fraction}) * ${TRAVEL} + ${MIN_EDGE} / 2)`;

/**
 * The parts of a Slider.
 *
 * @internal
 */
export const sliderStyles = stylex.create({
  control: {
    position: "relative",
    [cornerTokens.height]: sliderVars.height,
    touchAction: "pan-y",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    cursor: "pointer",
  },
  controlDisabled: {
    cursor: "not-allowed",
    opacity: opacity.disabled,
  },
  groove: {
    position: "relative",
    boxSizing: "border-box",
    blockSize: sliderVars.height,
    padding: controlSize._0,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: "transparent",
    backgroundColor: color.secondary,
    overflow: "clip",
    fontWeight: font.weight_5,
  },
  grooveInvalid: {
    borderColor: color.destructive,
  },
  inner: {
    position: "relative",
    blockSize: "100%",
    inlineSize: "100%",
  },
  tick: {
    position: "absolute",
    insetBlockStart: "50%",
    insetInlineStart: 0,
    inlineSize: border.size_1,
    blockSize: `calc(${MIN_EDGE} * 0.26)`,
    translate: "-50% -50%",
    backgroundColor: color.mutedForeground,
    opacity: 0.22,
  },
  text: {
    whiteSpace: "nowrap",
  },
  label: {
    position: "absolute",
    insetBlock: 0,
    insetInlineStart: sliderVars.pad,
    display: "flex",
    alignItems: "center",
    cursor: "inherit",
  },
  value: {
    position: "absolute",
    insetBlock: 0,
    insetInlineEnd: sliderVars.pad,
    display: "flex",
    alignItems: "center",
  },
  grooveText: {
    color: color.mutedForeground,
  },
  // The snapshot of the groove holds the value at the end of the groove, so
  // the liquid can bend it. The page shows the copy that moves instead.
  snapshotOnly: {
    filter: "opacity(0)",
  },
  valueRow: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingInlineEnd: sliderVars.pad,
    pointerEvents: "none",
  },
  valueMoved: {
    translate: sliderVars.valueX,
  },
  labelMoved: {
    translate: sliderVars.labelX,
  },
  // The panel and its cap fade as one, so the strip where they overlap does
  // not show through twice.
  panelGroup: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    opacity: {
      default: null,
      [stylex.when.ancestor(DRAWN_BY_EFFECT, sliderGrooveMarker)]:
        `calc(1 - ${sliderVars.melt})`,
    },
  },
  // As wide as the groove's inside, and moved back so its far edge is at the
  // value: a move is cheaper than a change of width, and keeps the corners.
  // Its near corners are then out of the groove, so the cap draws the near
  // end, and the panel shows only from the end of the cap.
  panel: {
    position: "absolute",
    inset: 0,
    [cornerTokens.height]: MIN_EDGE,
    overflow: "clip",
    backgroundColor: color.card,
    boxShadow: shadow._1,
    translate: `calc((${sliderVars.fraction} - 1) * ${TRAVEL})`,
    clipPath: `polygon(${CAP_END} -1em, calc(100% + 1em) -1em, calc(100% + 1em) calc(100% + 1em), ${CAP_END} calc(100% + 1em), ${CAP_END} calc(100% - 1px), calc(${CAP_END} - 1px) calc(100% - 1px), calc(${CAP_END} - 1px) 1px, ${CAP_END} 1px)`,
  },
  // The near half of a panel at the low end, which stays in place.
  panelCap: {
    position: "absolute",
    insetBlock: 0,
    insetInlineStart: 0,
    inlineSize: MIN_EDGE,
    [cornerTokens.height]: MIN_EDGE,
    backgroundColor: color.card,
    boxShadow: shadow._1,
    clipPath: "inset(-1em 50% -1em -1em)",
  },
  labelRow: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    paddingInlineStart: sliderVars.pad,
  },
  // The panel's text fades as it nears the handle, so the handle shows
  // clearly over it. Each row starts at the left of the groove's inside.
  // The value fades only while it lies in its place, not once it climbs.
  labelFade: {
    maskImage: `linear-gradient(to right, #000 calc(${sliderVars.handleX} - ${TEXT_FADE}), rgb(0 0 0 / ${String(TEXT_AT_HANDLE)}) ${sliderVars.handleX})`,
  },
  valueFade: {
    maskImage: `linear-gradient(to right, #000 calc(${sliderVars.handleX} - ${TEXT_FADE}), rgb(0 0 0 / calc(${String(TEXT_AT_HANDLE)} + ${String(1 - TEXT_AT_HANDLE)} * ${sliderVars.climb})) ${sliderVars.handleX})`,
  },
  // The panel's own copy of the label stays where the groove's is.
  panelLabelRow: {
    translate: `calc((1 - ${sliderVars.fraction}) * ${TRAVEL})`,
  },
  panelValueRow: {
    translate: `calc((1 - ${sliderVars.fraction}) * ${TRAVEL})`,
  },
  panelText: {
    color: color.foreground,
  },
  handle: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    translate: `calc(${sliderVars.fraction} * ${TRAVEL})`,
  },
  piece: {
    position: "absolute",
    insetInlineStart: `calc(${MIN_EDGE} - ${sliderVars.pad} - ${HALF_HANDLE})`,
    inlineSize: sliderVars.handleWidth,
    blockSize: `calc(${HANDLE_LENGTH} / 2 + ${HALF_HANDLE})`,
    backgroundColor: {
      default: color.mutedForeground,
      [stylex.when.ancestor(":active", sliderMarker)]: color.foreground,
    },
    transition: {
      default: `background-color ${duration._150} ${easing.ease}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
  topPiece: {
    insetBlockStart: `calc(50% - ${HANDLE_LENGTH} / 2)`,
    transformOrigin: "top",
    translate: `0 ${sliderVars.topY}`,
    scale: `1 ${sliderVars.topScale}`,
  },
  bottomPiece: {
    insetBlockEnd: `calc(50% - ${HANDLE_LENGTH} / 2)`,
    transformOrigin: "bottom",
    translate: `0 ${sliderVars.bottomY}`,
    scale: `1 ${sliderVars.bottomScale}`,
  },
  pieceInvalid: {
    backgroundColor: color.destructiveText,
  },
  // The input carries the keyboard, the focus ring and the value for a
  // screen reader. A pointer goes to the control, so the input draws
  // nothing but its ring.
  input: {
    position: "absolute",
    inset: 0,
    margin: 0,
    padding: 0,
    inlineSize: "100%",
    blockSize: "100%",
    appearance: "none",
    backgroundColor: "transparent",
    pointerEvents: "none",
    "::-webkit-slider-runnable-track": {
      appearance: "none",
      backgroundColor: "transparent",
    },
    "::-moz-range-track": {
      backgroundColor: "transparent",
    },
    "::-webkit-slider-thumb": {
      appearance: "none",
      inlineSize: 0,
      blockSize: 0,
      opacity: 0,
    },
    "::-moz-range-thumb": {
      inlineSize: 0,
      blockSize: 0,
      borderWidth: 0,
      opacity: 0,
    },
  },
  // Composed after `a11y.focusRing`, so the destructive ring wins — matching the
  // invalid treatment on the other fields.
  inputInvalid: {
    outlineColor: {
      default: "transparent",
      ":focus-visible": color.destructive,
    },
  },
});

/**
 * Where the panel is before the motion engine writes it, as a share of the range.
 *
 * @internal
 */
export const sliderAt = stylex.create({
  at: (fraction: number) => ({
    [sliderVars.fraction]: String(fraction),
  }),
});

/**
 * Where a tick of the groove is, in px from the left of its inside.
 *
 * @internal
 */
export const sliderTick = stylex.create({
  at: (x: number) => ({
    insetInlineStart: `${String(x)}px`,
  }),
});

/**
 * The `size` variants of a Slider.
 *
 * @internal
 */
export const sliderSizes = stylex.create({
  sm: {
    [sliderVars.height]: controlHeight.sm,
    [sliderVars.pad]: controlSize._3,
    [sliderVars.handleWidth]: "2px",
  },
  md: {
    [sliderVars.height]: controlHeight.md,
    [sliderVars.pad]: controlSize._4,
    [sliderVars.handleWidth]: "3px",
  },
  lg: {
    [sliderVars.height]: controlHeight.lg,
    [sliderVars.pad]: controlSize._5,
    [sliderVars.handleWidth]: "3px",
  },
});
