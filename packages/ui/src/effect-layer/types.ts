import type { Band } from "./compute-bands.ts";
import type { EffectColor } from "./parse-css-color.ts";
import type { ElementBox } from "./read-element-box.ts";
import type { CarrierKey } from "./resolve-carrier.ts";

/**
 * The kind of `<canvas>` element that a target is part of: one of the two
 * scroll ones of the page, which take turns to cover the document; the
 * fixed one, which covers the viewport; the bottom one, which covers the
 * viewport from its bottom edge and moves with it; or one of the two scroll
 * ones of a Scroll region, which take turns to cover its content.
 *
 * @internal
 */
export type EffectCanvasKind = "page" | "fixed" | "fixedBottom" | "region";

/**
 * The settings of one registration, one entry for each effect hook that has
 * settings. Effects read them from `EffectElementRecord.settings`.
 *
 * @internal
 */
export interface EffectSettings {
  readonly dust?: { readonly density: number };
  readonly extractorFan?: { readonly reach: number };
  readonly blackHole?: { readonly mass: number };
  readonly lightBeam?: {
    readonly angle: number | undefined;
    readonly followsPointer: boolean;
  };
  readonly liquid?: {
    readonly position: number;
    readonly drag: number | null;
    readonly pressed: boolean;
  };
}

/**
 * One registered element as it was last measured, before the frame places
 * it in `EffectFrame.elements`.
 *
 * @internal
 */
export interface MeasuredElement extends ElementBox {
  /** Stays the same while the element stays registered. */
  readonly id: number;
  readonly element: Element;
  /**
   * Changes each time the element is measured again, which happens only
   * after a signal that it can have changed. An effect that reads more of
   * the element than its box can keep what it read while this stays the
   * same.
   */
  readonly measurement: number;
  /** One bit per role, as `EFFECT_ROLES` orders them; 0 for none. */
  readonly roles: number;
  /** The settings its effect hooks gave it. */
  readonly settings: EffectSettings;
  /**
   * The scope it is in: the scope of the nearest `EffectContainer` above its
   * effect hooks in the React tree, or `PAGE_SCOPE`. Effects act only between
   * elements of one scope.
   */
  readonly scope: number;
  /** The scope it holds as an Effect container, or `null`. */
  readonly holds: number | null;
  /**
   * The Effect carrier it draws on: the one it was last measured on. The
   * declared carrier comes from the nearest `EffectCarrier` above its effect
   * hooks in the React tree. Measurement does not choose it.
   */
  readonly carrier: CarrierKey;
  /**
   * Each carrier it can draw on: `carrier`, and the other one of each
   * sticky carrier that it is on, which it moves to when that box sticks or
   * lets go.
   */
  readonly carriers: readonly CarrierKey[];
}

/**
 * One registered element as it was last measured. Its
 * index in `EffectFrame.elements` is its index in WGSL's `effectElements`.
 *
 * @internal
 */
export interface EffectElementRecord extends MeasuredElement {
  /** The index in `EffectFrame.scopes` of its scope. */
  readonly scopeIndex: number;
  /** The index in `EffectFrame.carriers` of its carrier. */
  readonly carrierIndex: number;
}

/**
 * A range of `EffectFrame.elements`.
 *
 * @internal
 */
export interface ElementRange {
  readonly firstElement: number;
  readonly elementCount: number;
}

/**
 * The elements that effects let act on each other: the page, or the
 * elements inside one `EffectContainer`.
 *
 * @internal
 */
export interface EffectScope {
  /** `PAGE_SCOPE` for the page, or the scope the Effect container holds. */
  readonly id: number;
  /**
   * The index in `EffectFrame.elements` of the Effect container, or -1 for
   * the page. Its effects draw only inside that container's border box.
   */
  readonly container: number;
  /**
   * What the scope's effects draw over: the fill of the nearest container,
   * from this one out, whose fill is at least half opaque, or else the
   * page's backdrop.
   */
  readonly backdrop: EffectColor;
  /** Whether the backdrop is dark, so light effects add to it. */
  readonly dark: boolean;
  /** Its elements on each carrier, in the order of `EffectFrame.carriers`. */
  readonly ranges: readonly ElementRange[];
}

/**
 * The primary pointer, in page coordinates. A mouse is present while it is
 * over the page; a finger or a pen while it touches or hovers.
 *
 * @internal
 */
export interface EffectPointer {
  readonly x: number;
  readonly y: number;
  /** CSS px per second, falling to 0 when the pointer stops. */
  readonly velocityX: number;
  readonly velocityY: number;
  readonly pressed: boolean;
  readonly present: boolean;
  /** The `pointerType` of the last event: `"mouse"`, `"pen"` or `"touch"`. */
  readonly pointerType: string;
}

/**
 * What every effect gets once the device is ready.
 *
 * @internal
 */
export interface EffectSetup {
  readonly device: GPUDevice;
  /** The colour format of every `<canvas>` element, for a render pipeline's target. */
  readonly format: GPUTextureFormat;
  /**
   * Group 0 of every pipeline, render or compute: the page and every
   * registered element, declared in WGSL as `PAGE_WGSL`.
   */
  readonly pageLayout: GPUBindGroupLayout;
  /**
   * Group 1 of every render pipeline: the target being drawn, declared in
   * WGSL as `TARGET_WGSL`.
   */
  readonly targetLayout: GPUBindGroupLayout;
  /** Draws one more frame, for a change the effect layer cannot see. */
  readonly requestFrame: () => void;
}

/**
 * One render pass: a band on a scroll `<canvas>` element of the page or of
 * a Scroll region, the fixed `<canvas>` element, or the bottom one. Lengths
 * are CSS px; positions are page coordinates, from the top-left corner of
 * the document. The pass clears the whole `<canvas>` element and has its
 * scissor rect set to the part to draw.
 *
 * @internal
 */
export interface EffectTarget {
  readonly kind: EffectCanvasKind;
  /** The index in `EffectFrame.carriers` of its carrier. */
  readonly carrier: number;
  /**
   * The band this pass draws, with the part drawn this frame, or `null` on
   * the fixed and the bottom `<canvas>` elements. The band of a Scroll
   * region is in the coordinates of its content box.
   */
  readonly band: Band | null;
  /**
   * The `<canvas>` element's top-left corner: the page position of the band,
   * the scroll position on the fixed `<canvas>` element, or the scroll
   * position plus the viewport's bottom edge less the height on the bottom
   * one.
   */
  readonly x: number;
  readonly y: number;
  /** The CSS size of the `<canvas>` element. */
  readonly width: number;
  readonly height: number;
  /**
   * The elements that draw on this `<canvas>` element, as a range of
   * `EffectFrame.elements`: the ones on its carrier, of every scope. Pass it to an instanced draw as
   * `pass.draw(vertices, elementCount, 0, firstElement)`.
   */
  readonly firstElement: number;
  readonly elementCount: number;
  /** Group 1, laid out as `targetLayout`. */
  readonly bindGroup: GPUBindGroup;
}

/**
 * What a frame knows about the page, in the same units as `EffectTarget`.
 *
 * @internal
 */
export interface EffectFrame {
  /** Seconds since the effect layer started. */
  readonly time: number;
  /**
   * Seconds since the previous frame, at most a tenth of a second, or 0
   * when no frame asked for this one: the first frame after the loop was
   * idle.
   */
  readonly delta: number;
  /** Draw a still frame: under reduced motion no frame follows on its own. */
  readonly reducedMotion: boolean;
  readonly viewport: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    /** The large viewport height, so a mobile URL bar does not change it. */
    readonly height: number;
  };
  readonly documentHeight: number;
  /**
   * The carrier of each range of `EffectScope.ranges`: the page, the
   * viewport, the viewport's bottom edge, then each Scroll region by id.
   */
  readonly carriers: readonly CarrierKey[];
  /**
   * Every registered element with a box, as it is at the start of this
   * frame, grouped by carrier in the order of `carriers`, each group by
   * scope in the order of `scopes`, so each scope is one range of each
   * group. An element whose Effect
   * container has no box is not here. An element is measured again only
   * after it can have changed.
   */
  readonly elements: readonly EffectElementRecord[];
  /**
   * The page first, at `PAGE_SCOPE`, then the scope of each Effect container
   * with a box. In WGSL, `effectScopes` has them in the same order.
   */
  readonly scopes: readonly EffectScope[];
  readonly pointer: EffectPointer;
  /**
   * Group 0, laid out as `pageLayout`. Each render pass has it set already; a
   * compute pass sets it itself. It changes when the element buffer grows.
   */
  readonly pageBindGroup: GPUBindGroup;
  /** Every pass of this frame. */
  readonly targets: readonly EffectTarget[];
}

/**
 * The calls of a render pass that an effect's `draw` can make. The pass of
 * a `<canvas>` element begins only once something draws on it, so a draw
 * with no vertices or no instances draws nothing.
 *
 * @internal
 */
export interface EffectPass {
  setPipeline: (pipeline: GPURenderPipeline) => void;
  setBindGroup: (index: number, bindGroup: GPUBindGroup | null) => void;
  setVertexBuffer: (slot: number, buffer: GPUBuffer | null) => void;
  draw: (
    vertexCount: number,
    instanceCount?: number,
    firstVertex?: number,
    firstInstance?: number,
  ) => void;
}

/**
 * An effect's GPU work, made once per device.
 *
 * @internal
 */
export interface EffectRenderer {
  /**
   * Runs once per frame before any draw: encode compute passes here. Return
   * `true` to ask for the next frame, or an `EffectFrame.time` to ask for a
   * frame at that time, also under reduced motion; the loop stops when no
   * effect asks.
   */
  update?: (encoder: GPUCommandEncoder, frame: EffectFrame) => boolean | number;
  /**
   * Draws into every target of the frame, with groups 0 and 1 set; the
   * effect skips what it does not own.
   */
  draw: (pass: EffectPass, target: EffectTarget, frame: EffectFrame) => void;
  /**
   * Draw a frame each time the pointer moves, or only for the moves this
   * function returns `true` for.
   */
  followsPointer?: boolean | ((pointer: EffectPointer) => boolean);
  destroy: () => void;
}

/**
 * Something the effect layer draws, set up once on the shared device. An
 * effect draws on each target of a frame. A target is a part of the
 * `<canvas>` element of an Effect carrier. An effect must not make its own
 * `<canvas>` element.
 *
 * @internal
 */
export interface Effect {
  setup: (setup: EffectSetup) => EffectRenderer | Promise<EffectRenderer>;
}
