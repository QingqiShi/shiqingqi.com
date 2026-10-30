import type { LiquidInstance } from "./liquid-layout.ts";
import type { EffectInput } from "./types.ts";

/**
 * The bits of `LiquidInstance.flags`.
 *
 * @internal
 */
export const FLAG_COVER = 1;
/** @internal */
export const FLAG_SEE_THROUGH = 2;
/** @internal */
export const FLAG_LIGHT_BODY = 4;
/** @internal */
export const FLAG_VERTICAL = 8;

/**
 * A ring inside the edge of a track: its colour off and on, sRGB-encoded with
 * straight alpha, and its width in CSS px. A ring with no width is none.
 *
 * @internal
 */
export interface TrackRing {
  readonly off: readonly [number, number, number, number];
  readonly on: readonly [number, number, number, number];
  readonly width: number;
}

/**
 * One control's liquid as a frame draws it, in page coordinates and CSS px:
 * a Switch's thumb or a segmented control's indicator. For a `vertical`
 * track, the coordinates are in the track's frame: the page turned over the
 * diagonal through the origin, so x runs down the track and y across it.
 *
 * @internal
 */
export interface LiquidInstanceRecord {
  /** Its control's index in `EffectFrame.elements` and in `effectElements`. */
  readonly elementIndex: number;
  /** The slot of the simulation buffer that holds its particles, and how many of them are in use. */
  readonly slot: number;
  readonly particleCount: number;
  /** Its beads' range in the bead buffer. */
  readonly firstBead: number;
  readonly beadCount: number;
  /** The rest radius: half the height of the thumb or the indicator. */
  readonly radius: number;
  /** From 0 while the liquid moves to 1 once it rests in its rest shape. */
  readonly calm: number;
  /** The centre of the off position, where track space starts. */
  readonly originX: number;
  readonly originY: number;
  /** Where the centre of the rest shape is now, along the track. */
  readonly restX: number;
  /**
   * Half the length of the rest shape's straight part: the rest shape is a
   * capsule, and a thumb's is a circle, with no span.
   */
  readonly span: number;
  /** The reach of each particle, as `LiquidBody.scale` gives it. */
  readonly scale: number;
  /** How far the melted liquid spreads past its rest shape. */
  readonly spread: number;
  /** The centre of the liquid's mass, in track space and CSS px. */
  readonly centreX: number;
  readonly centreY: number;
  /** The selected surface's colour over the track, sRGB-encoded. */
  readonly thumb: readonly [number, number, number];
  /** How solid the surface is, from 0 as clear water to 1 as the control's own solid surface. */
  readonly firm: number;
  /** The selected surface's colour is light, so a light highlight on it does not show. */
  readonly lightBody: boolean;
  /** The track's off fill and its on fill. */
  readonly off: readonly [number, number, number];
  readonly on: readonly [number, number, number];
  /** The ring inside the track's edge, which changes from off to on with the fill. */
  readonly ring: TrackRing;
  /**
   * How far the on fill has risen through the track, from 0 off to 1 on,
   * and how far it rises to.
   */
  readonly rise: number;
  readonly riseGoal: number;
  /** The effect paints the track, not only the liquid. */
  readonly cover: boolean;
  /** The track shows through the liquid, as through a segmented control's indicator. */
  readonly seeThrough: boolean;
  /** The corners of the rest shape, or none for a pill. */
  readonly corner?: { readonly radius: number; readonly exponent: number };
  /** What the page shows around the track. */
  readonly backdrop: readonly [number, number, number];
  /** How much of the liquid the effect draws: 1 in motion, 0 at rest, where the control draws it. */
  readonly body: number;
  /**
   * How much the last move lifts the glint on the lit edge, from -1 to 1:
   * positive after a move along the track, and negative after a move back.
   */
  readonly glint: number;
  /**
   * The track runs down the page, as the rail of a TabView does, and not
   * along it.
   */
  readonly vertical?: boolean;
  /** The control's own edge, which the effect draws round the solid surface: ring, two shadows, inset ring. */
  readonly edge: readonly [number, number, number, number];
  /** How much of the lit edge it draws, from 0 to 1. */
  readonly edgeLit: number;
  /**
   * Under reduced motion, the solid rest shape that fades out as the new one
   * fades in: the centre of its straight part along the track and half its
   * length, in CSS px, and how much of it the effect draws. None at 0.
   */
  readonly leaving: readonly [number, number, number];
}

const flagsOf = (liquid: LiquidInstanceRecord) =>
  (liquid.cover ? FLAG_COVER : 0) |
  (liquid.seeThrough ? FLAG_SEE_THROUGH : 0) |
  (liquid.lightBody ? FLAG_LIGHT_BODY : 0) |
  (liquid.vertical === true ? FLAG_VERTICAL : 0);

/**
 * `liquids[index]` for one control's liquid.
 *
 * @internal
 */
export function liquidInstanceValue(
  liquid: LiquidInstanceRecord,
): EffectInput<typeof LiquidInstance> {
  return {
    element: liquid.elementIndex,
    slot: liquid.slot,
    particleCount: liquid.particleCount,
    firstBead: liquid.firstBead,
    beadCount: liquid.beadCount,
    flags: flagsOf(liquid),
    radius: liquid.radius,
    calm: liquid.calm,
    origin: [liquid.originX, liquid.originY],
    body: liquid.body,
    edgeLit: liquid.edgeLit,
    thumb: liquid.thumb,
    firm: liquid.firm,
    off: liquid.off,
    rise: liquid.rise,
    on: liquid.on,
    riseGoal: liquid.riseGoal,
    backdrop: liquid.backdrop,
    spread: liquid.spread,
    restX: liquid.restX,
    span: liquid.span,
    centre: [liquid.centreX, liquid.centreY],
    glint: liquid.glint,
    scale: liquid.scale,
    ringWidth: liquid.ring.width,
    edge: liquid.edge,
    ringOff: liquid.ring.off,
    ringOn: liquid.ring.on,
    corner:
      liquid.corner === undefined
        ? [0, 0]
        : [liquid.corner.radius, liquid.corner.exponent],
    leaving: liquid.leaving,
  };
}
