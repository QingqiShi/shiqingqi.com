import type { Band } from "./compute-bands.ts";

/**
 * The `<canvas>` elements a use of an effect needs: the two scroll ones,
 * which take turns to cover the document, or the fixed one, which covers the
 * viewport for fixed elements.
 *
 * @internal
 */
export type EffectCanvas = "scroll" | "fixed";

/**
 * One registration of an effect. The same effect can have many uses; the
 * `<canvas>` elements mount for the uses that need them.
 *
 * @internal
 */
export interface EffectUse {
  readonly effect: Effect;
  readonly canvas: EffectCanvas;
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
   * Group 0 of every render pipeline: the uniforms of the target being drawn,
   * declared in WGSL as `TARGET_WGSL`.
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
  /** Group 0, laid out as `targetLayout`. */
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
  /** Draws into every target of the frame; the effect skips what it does not own. */
  draw: (
    pass: GPURenderPassEncoder,
    target: EffectTarget,
    frame: EffectFrame,
  ) => void;
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
