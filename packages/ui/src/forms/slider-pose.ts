import { clamp } from "../clamp.ts";
import type { SliderLiquidView } from "../effect-layer/slider-liquid-runs.ts";
import { px, type Styles } from "../motion/px.ts";
import { sliderVars } from "./slider.stylex.ts";

/**
 * The line of a Slider's handle, in CSS px down the groove's inside. The
 * line is two pieces that meet in the middle, each with a round cap at its
 * outer end.
 *
 * - `center` is the middle of the groove.
 * - `length` is the length of the whole line.
 * - `radius` is half its width: the pieces overlap by one cap, so the
 *   joined line shows no notch.
 * - `gap` is the height of the text that the line gives way to.
 * - `margin` is the least room left above and below the line.
 *
 * @internal
 */
export interface HandleLine {
  readonly center: number;
  readonly length: number;
  readonly radius: number;
  readonly gap: number;
  readonly margin: number;
}

/**
 * The top piece of the handle's line at `split`, from 0 joined to 1 open
 * round a line of text, as `[top, bottom]` in CSS px. The bottom piece is
 * its mirror across `center`. Open, each piece reaches out to `margin`
 * from the edge and stops short of the text, and keeps at least a dot.
 *
 * @internal
 */
export function handlePiece(
  split: number,
  { center, length, radius, gap, margin }: HandleLine,
): readonly [number, number] {
  const joinedTop = center - length / 2;
  const joinedBottom = center + radius;
  const openTop = Math.min(margin, joinedTop);
  const openBottom = Math.max(openTop + 2 * radius, center - gap / 2);
  return [
    joinedTop + (openTop - joinedTop) * split,
    joinedBottom + (openBottom - joinedBottom) * split,
  ];
}

/**
 * The layout of a Slider's groove, measured in its own px. The panel starts
 * at the left of the groove's inside, and its far edge travels from
 * `minEdge`, a panel as long as it is tall, to the width of the inside.
 *
 * @internal
 */
export interface SliderGeometry {
  /** The groove's border box, and its inside from its top-left corner. */
  readonly size: readonly [number, number];
  readonly inner: readonly [number, number, number, number];
  readonly minEdge: number;
  /** The middle of the handle at the low end of the range. */
  readonly handleMin: number;
  readonly line: HandleLine;
  /** The label on the groove, from the left of the inside, or `null` with none. */
  readonly label: readonly [number, number] | null;
  /** The value at the end of the groove, from the left of the inside. */
  readonly value: readonly [number, number];
  /** The room between the value and the handle once the value is on the panel. */
  readonly beside: number;
  readonly corner: number;
  /** The shape of the panel's corners, as the power of a superellipse: 2 is a circle, 4 a squircle. */
  readonly cornerPower: number;
}

/**
 * The parts of a Slider that `measureSlider` reads.
 *
 * @internal
 */
export interface SliderParts {
  readonly groove: HTMLElement;
  readonly inner: HTMLElement;
  readonly topPiece: HTMLElement;
  readonly label: HTMLElement | null;
  readonly value: HTMLElement;
  readonly panel: HTMLElement;
}

/**
 * Reads the layout of a Slider from its parts. Offsets leave out the
 * transforms that its motion writes.
 *
 * @internal
 */
export function measureSlider({
  groove,
  inner,
  topPiece,
  label,
  value,
  panel,
}: SliderParts): SliderGeometry {
  const width = inner.clientWidth;
  const height = inner.clientHeight;
  const radius = topPiece.offsetWidth / 2;
  const center = height / 2;
  const fontSize = Number.parseFloat(getComputedStyle(groove).fontSize) || 16;
  const pad = width - value.offsetLeft - value.offsetWidth;
  const panelStyle = getComputedStyle(panel);
  const cornerShape = panelStyle.getPropertyValue("corner-top-right-shape");
  return {
    size: [groove.offsetWidth, groove.offsetHeight],
    inner: [
      groove.clientLeft + inner.offsetLeft,
      groove.clientTop + inner.offsetTop,
      width,
      height,
    ],
    minEdge: height,
    handleMin: topPiece.offsetLeft + radius,
    line: {
      center,
      length: 2 * (center - topPiece.offsetTop),
      radius,
      gap: fontSize * 0.95,
      margin: Math.max(radius * 2, height * 0.12),
    },
    label:
      label === null
        ? null
        : [label.offsetLeft, label.offsetLeft + label.offsetWidth],
    value: [value.offsetLeft, value.offsetLeft + value.offsetWidth],
    beside: pad / 2 + radius,
    corner: Math.min(
      Number.parseFloat(panelStyle.borderTopRightRadius) || 0,
      height / 2,
    ),
    cornerPower: cornerShape === "" || cornerShape === "round" ? 2 : 4,
  };
}

/**
 * How far the panel's far edge travels over the range.
 *
 * @internal
 */
export const travelOf = (geometry: SliderGeometry) =>
  Math.max(0, geometry.inner[2] - geometry.minEdge);

/**
 * The panel's far edge at `fraction` of the range.
 *
 * @internal
 */
export const edgeAt = (geometry: SliderGeometry, fraction: number) =>
  geometry.minEdge + fraction * travelOf(geometry);

/**
 * The fraction of the range at which the panel's far edge is at `edge`.
 *
 * @internal
 */
export function fractionAtEdge(geometry: SliderGeometry, edge: number) {
  const travel = travelOf(geometry);
  return travel > 0 ? clamp((edge - geometry.minEdge) / travel, 0, 1) : 0;
}

/**
 * The middle of the handle at `fraction` of the range.
 *
 * @internal
 */
export const handleAt = (geometry: SliderGeometry, fraction: number) =>
  geometry.handleMin + fraction * travelOf(geometry);

/** How far the value has moved from the end of the groove, towards the handle. */
function valueShift(geometry: SliderGeometry, fraction: number, climb: number) {
  const besideHandle =
    handleAt(geometry, fraction) - geometry.line.radius - geometry.beside;
  return clamp(climb, 0, 1) * Math.min(0, besideHandle - geometry.value[1]);
}

/**
 * How far the value moves to climb onto the panel at `fraction`, to beside
 * the handle.
 *
 * @internal
 */
export const valueClimb = (geometry: SliderGeometry, fraction: number) =>
  -valueShift(geometry, fraction, 1);

/**
 * How far the label moves at `fraction` to step off the panel, into the
 * groove beside the panel's edge. It keeps the room from the edge that the
 * value keeps from the handle once it climbs.
 *
 * @internal
 */
export function labelPush(geometry: SliderGeometry, fraction: number) {
  if (geometry.label === null) return 0;
  const besideEdge =
    edgeAt(geometry, fraction) + geometry.beside - geometry.line.radius;
  return Math.max(0, besideEdge - geometry.label[0]);
}

/**
 * The handle lies across the label or the value, with `clearance` px to
 * spare, so its line opens round the text.
 *
 * @internal
 */
export function crossesText(
  geometry: SliderGeometry,
  fraction: number,
  { climb, push }: { readonly climb: number; readonly push: number },
  clearance: number,
) {
  const x = handleAt(geometry, fraction);
  const reach = geometry.line.radius + clearance;
  const across = (span: readonly [number, number] | null, shift: number) =>
    span !== null && x + reach > span[0] + shift && x - reach < span[1] + shift;
  return (
    across(geometry.label, clamp(push, 0, 1) * labelPush(geometry, fraction)) ||
    across(geometry.value, valueShift(geometry, fraction, climb))
  );
}

const name = (variable: string) => variable.slice(4, -1);
const VARS = {
  fraction: name(sliderVars.fraction),
  valueX: name(sliderVars.valueX),
  climb: name(sliderVars.climb),
  labelX: name(sliderVars.labelX),
  handleX: name(sliderVars.handleX),
  topY: name(sliderVars.topY),
  topScale: name(sliderVars.topScale),
  bottomY: name(sliderVars.bottomY),
  bottomScale: name(sliderVars.bottomScale),
  melt: name(sliderVars.melt),
};

/**
 * The styles that show a Slider's motion, written on its control: where
 * the panel is, how far the value has climbed onto it, how far the label
 * has stepped off it, where the handle is, how far the handle's line has
 * opened, and how far the panel has melted. Until the geometry is measured,
 * only the panel and the melt show.
 *
 * @internal
 */
export function sliderPose(
  geometry: SliderGeometry | null,
  fraction: number,
  climb: number,
  push: number,
  split: number,
  melt: number,
): Styles {
  const shared = {
    [VARS.fraction]: fraction.toFixed(5),
    [VARS.melt]: clamp(melt, 0, 1).toFixed(3),
  };
  if (geometry === null) {
    return shared;
  }
  const { center, length, radius } = geometry.line;
  const joinedTop = center - length / 2;
  const [top, bottom] = handlePiece(clamp(split, 0, 1), geometry.line);
  const stretch = ((bottom - top) / (length / 2 + radius)).toFixed(4);
  return {
    ...shared,
    [VARS.valueX]: px(valueShift(geometry, fraction, climb)),
    [VARS.climb]: clamp(climb, 0, 1).toFixed(3),
    [VARS.labelX]: px(clamp(push, 0, 1) * labelPush(geometry, fraction)),
    [VARS.handleX]: px(handleAt(geometry, fraction)),
    [VARS.topY]: px(top - joinedTop),
    [VARS.topScale]: stretch,
    [VARS.bottomY]: px(joinedTop - top),
    [VARS.bottomScale]: stretch,
  };
}

/**
 * The panel as the Slider liquid draws it, at `fraction` of the range,
 * moving at `speed` fractions a second.
 *
 * @internal
 */
export function sliderLiquidView(
  geometry: SliderGeometry,
  fraction: number,
  speed: number,
  split: number,
  melt: number,
): SliderLiquidView {
  return {
    size: geometry.size,
    inner: geometry.inner,
    edge: edgeAt(geometry, fraction),
    velocity: speed * travelOf(geometry),
    melt,
    corner: geometry.corner,
    cornerPower: geometry.cornerPower,
    handle: {
      x: handleAt(geometry, fraction),
      radius: geometry.line.radius,
      center: geometry.line.center,
      top: handlePiece(clamp(split, 0, 1), geometry.line),
    },
  };
}
