import type { Band } from "./compute-bands.ts";
import type { ElementBox } from "./read-element-box.ts";

/**
 * The `<canvas>` elements of the effect layer: the two scroll ones, which take
 * turns to cover the document, or the fixed one, which covers the viewport
 * for fixed elements.
 *
 * @internal
 */
export type EffectCanvas = "scroll" | "fixed";

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
}

/**
 * One registered element as it was last measured. Its
 * index in `EffectFrame.elements` is its index in WGSL's `effectElements`.
 *
 * @internal
 */
export interface EffectElementRecord extends ElementBox {
  /** Stays the same while the element stays registered. */
  readonly id: number;
  readonly element: Element;
  /** One bit per role, as `EFFECT_ROLES` orders them; 0 for none. */
  readonly roles: number;
  /** The settings its effect hooks gave it. */
  readonly settings: EffectSettings;
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
 * One render pass: a band on a scroll `<canvas>` element, or the fixed
 * `<canvas>` element. Lengths are CSS px; positions are page coordinates,
 * from the top-left corner of the document. The pass clears the whole
 * `<canvas>` element and has its scissor rect set to the part to draw.
 *
 * @internal
 */
export interface EffectTarget {
  readonly canvas: EffectCanvas;
  /**
   * The band this pass draws, with the part drawn this frame, or `null` on
   * the fixed `<canvas>` element.
   */
  readonly band: Band | null;
  /**
   * The `<canvas>` element's top-left corner: the band's document offset, or
   * the scroll position on the fixed `<canvas>` element.
   */
  readonly x: number;
  readonly y: number;
  /** The CSS size of the `<canvas>` element. */
  readonly width: number;
  readonly height: number;
  /**
   * The elements that draw on this `<canvas>` element, as a range of
   * `EffectFrame.elements`: the ones in the document on a band, the fixed
   * ones on the fixed `<canvas>` element. Pass it to an instanced draw as
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
  /** Seconds since the previous frame, at most a tenth of a second. */
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
   * Every registered element with a box, as it is at the start of this
   * frame: the ones in the document first, then the fixed ones. An element
   * is measured again only after it can have changed.
   */
  readonly elements: readonly EffectElementRecord[];
  readonly pointer: EffectPointer;
  /**
   * Group 0, laid out as `pageLayout`. Each render pass has it set already; a
   * compute pass sets it itself. It changes when the element buffer grows.
   */
  readonly pageBindGroup: GPUBindGroup;
  /** Every pass of this frame, bands first. */
  readonly targets: readonly EffectTarget[];
}

/**
 * An effect's GPU work, made once per device.
 *
 * @internal
 */
export interface EffectRenderer {
  /**
   * Runs once per frame before any draw: encode compute passes here. Return
   * `true` to ask for the next frame; the loop stops when no effect asks.
   */
  update?: (encoder: GPUCommandEncoder, frame: EffectFrame) => boolean;
  /**
   * Draws into every target of the frame, with groups 0 and 1 set; the
   * effect skips what it does not own.
   */
  draw: (
    pass: GPURenderPassEncoder,
    target: EffectTarget,
    frame: EffectFrame,
  ) => void;
  /** Draw a frame each time the pointer moves. */
  followsPointer?: boolean;
  destroy: () => void;
}

/**
 * Something the effect layer draws, set up once on the shared device.
 *
 * @internal
 */
export interface Effect {
  setup: (setup: EffectSetup) => EffectRenderer | Promise<EffectRenderer>;
}
