import type { d } from "typegpu";
import type { Band, ScissorRect } from "./compute-bands.ts";
import type { EffectBindGroup } from "./create-binding.ts";
import type { RegisteredRegion } from "./create-effect-registry.ts";
import type { CarrierClock, MeasureContext } from "./create-element-tracker.ts";
import type { LiquidControl } from "./liquid-reader.ts";
import type { EffectColor } from "./parse-css-color.ts";
import type { ElementBox } from "./read-element-box.ts";
import type { CarrierKey } from "./resolve-carrier.ts";
import type { RingLightReading } from "./ring-light-effect.ts";
import type { FrameClock } from "./track-elements.ts";

/**
 * The settings of one registration, one entry for each effect hook that has
 * settings. Effects read them from `EffectElementRecord.settings`.
 *
 * @internal
 */
export interface EffectSettings {
  readonly dust?: {
    readonly density: number;
    readonly burst: number;
    readonly colorFrom: "fill" | "text";
    readonly onShed?: () => void;
  };
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
 * What the element tracker reads of an element for each role that has a
 * `RoleReader`, beyond its box. Effects read them from
 * `EffectElementRecord.readings`.
 *
 * @internal
 */
export interface EffectReadings {
  /** The control, or `null` when the liquid can draw in none. */
  readonly liquid?: LiquidControl | null;
  readonly ringLight?: RingLightReading;
  /** The element's CSS `color`, for dust that takes it. */
  readonly dust?: EffectColor;
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
   * What the effects of its roles read of it beyond its box, as their
   * `RoleReader` reads it each time the element is measured: a new object
   * for each measurement.
   */
  readonly readings: EffectReadings;
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
 * One registered element as it was last measured. Its index in
 * `EffectFrame.elements` is its index in `effectElements` of `pageLayout`.
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
  /**
   * The shared device. A pipeline takes `pageLayout` in group 0 and, for a
   * render pipeline, `targetLayout` in group 1.
   */
  readonly device: GPUDevice;
  /**
   * A render pipeline's colour target: the format of every `<canvas>`
   * element, and `PREMULTIPLIED_BLEND`.
   */
  readonly colorTarget: {
    readonly format: GPUTextureFormat;
    readonly blend: GPUBlendState;
  };
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
  /**
   * The index in `EffectFrame.carriers` of its carrier, which tells which
   * `<canvas>` element it is part of.
   */
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
  /** The top and the bottom page y of the part this pass draws. */
  readonly drawnPageRange: readonly [number, number];
  /**
   * The elements that draw on this `<canvas>` element, as a range of
   * `EffectFrame.elements`: the ones on its carrier, of every scope. Pass it to an instanced draw as
   * `pass.draw(vertices, elementCount, 0, firstElement)`.
   */
  readonly firstElement: number;
  readonly elementCount: number;
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
   * with a box. `effectScopes` of `pageLayout` has them in the same order.
   */
  readonly scopes: readonly EffectScope[];
  readonly pointer: EffectPointer;
  /**
   * Group 0, laid out as `pageLayout`. Each render pass has it set already;
   * a compute pass takes it through `dispatch`. It changes when a buffer of
   * the page grows.
   */
  readonly pageBindGroup: EffectBindGroup;
  /** Every pass of this frame. */
  readonly targets: readonly EffectTarget[];
}

/**
 * The render pass that an effect's `draw` draws in, with groups 0 and 1
 * set. The pass of a `<canvas>` element begins only once something draws on
 * it, so a draw with no vertices or no instances draws nothing.
 *
 * @internal
 */
export interface EffectPass {
  /**
   * Draws with `pipeline`, and with `group`, the effect's own group, in
   * `EFFECT_GROUP`, or none.
   */
  draw: (
    pipeline: GPURenderPipeline,
    group: EffectBindGroup | null,
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
  /** Draws into every target of the frame; the effect skips what it does not own. */
  draw: (pass: EffectPass, target: EffectTarget, frame: EffectFrame) => void;
  /**
   * Draw a frame each time the pointer moves, or only for the moves this
   * function returns `true` for.
   */
  followsPointer?: boolean | ((pointer: EffectPointer) => boolean);
  /**
   * The carriers whose `<canvas>` elements the effect still draws on after
   * the last element with a role has left them, as of its last `update`.
   */
  holds?: () => readonly CarrierKey[];
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

/**
 * A `<canvas>` element that the effect layer configured, as a carrier sees
 * it.
 *
 * @internal
 */
export interface CarrierSurface {
  readonly canvas: HTMLCanvasElement;
}

/**
 * What the `<canvas>` elements of a carrier take from the effect layer.
 *
 * @internal
 */
export interface CanvasKit<Surface extends CarrierSurface> {
  /** `null` when the `<canvas>` element has no WebGPU context. */
  readonly configure: (canvas: HTMLCanvasElement) => Surface | null;
  readonly release: (surface: Surface) => void;
  /** Gives the `<canvas>` element a CSS size and a backing store for it. */
  readonly size: (
    canvas: HTMLCanvasElement,
    cssWidth: number,
    cssHeight: number,
  ) => void;
}

/**
 * What a frame tells each carrier: the clock of the frame, the document
 * that the page's bands cover, in page coordinates, the large viewport
 * height, and the device pixel ratio.
 *
 * @internal
 */
export interface CarrierFrame {
  readonly clock: FrameClock;
  readonly document: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
  readonly viewportHeight: number;
  readonly pixelRatio: number;
}

/**
 * One render pass on one `<canvas>` element of a carrier.
 *
 * @internal
 */
export interface CarrierPass<Surface extends CarrierSurface> {
  readonly surface: Surface;
  readonly target: EffectTarget;
  readonly scissor: ScissorRect;
}

/**
 * The `<canvas>` elements of one carrier, which it places, sizes and draws.
 *
 * @internal
 */
export interface CarrierCanvases<Surface extends CarrierSurface> {
  /** The `<canvas>` elements it was given. */
  readonly canvases: readonly HTMLCanvasElement[];
  /** Sizes the `<canvas>` elements again when the size they need changes. */
  readonly size: (frame: CarrierFrame) => void;
  /**
   * Places the `<canvas>` elements and lists the passes of this frame.
   * `carrier` is the index of the carrier in `EffectFrame.carriers`, and
   * `range` its elements.
   */
  readonly passes: (
    frame: CarrierFrame,
    carrier: number,
    range: ElementRange,
  ) => CarrierPass<Surface>[];
  readonly release: () => void;
}

/**
 * The `<canvas>` elements that a carrier needs, and `content`, the content
 * box of the Scroll region that holds them, or `null` when the effect layer
 * holds them.
 *
 * @internal
 */
export interface CanvasNeed {
  readonly key: CarrierKey;
  readonly content: Element | null;
}

/** @internal */
export type RegionLookup = (id: number) => RegisteredRegion | undefined;

/**
 * An Effect carrier: how a box moves on it, and its `<canvas>` elements.
 * `carrierOf` gives the carrier of a `CarrierKey`.
 *
 * @internal
 */
export interface Carrier {
  readonly key: CarrierKey;
  /**
   * The box, measured in viewport coordinates, in the coordinates of the
   * carrier, or `null` when they cannot be read.
   */
  readonly toLocal: (
    box: ElementBox,
    context: MeasureContext,
  ) => ElementBox | null;
  /**
   * A box in the coordinates of the carrier, in page coordinates at the
   * time of `clock`, or `null` while the carrier has no place.
   */
  readonly toPage: (
    local: ElementBox,
    clock: CarrierClock,
  ) => ElementBox | null;
  /**
   * The box that a move watch of `element` watches against: one that moves
   * with the carrier, so that a scroll does not move the element in it.
   * `null` is the viewport.
   */
  readonly watchRoot: (
    element: Element,
    context: MeasureContext,
  ) => Element | null;
  /**
   * The `<canvas>` elements that an element with a role on the carrier
   * needs, or `null` while the modal Effect covers in `modalCovers` hide the
   * carrier, or while it has no content box.
   */
  readonly need: (
    modalCovers: readonly Element[],
    region: RegionLookup,
  ) => CanvasNeed | null;
  readonly createCanvases: <Surface extends CarrierSurface>(
    canvases: readonly HTMLCanvasElement[],
    kit: CanvasKit<Surface>,
  ) => CarrierCanvases<Surface>;
}

declare const schemaOf: unique symbol;

/**
 * How a schema of a `*-layout.ts` module lays out in a buffer, as
 * `codegen/generate-wgsl.ts` resolves it, so that the browser writes the
 * values without TypeGPU.
 *
 * @internal
 */
export interface EffectData<Schema extends d.AnyWgslData> {
  readonly label: string;
  /** The bytes that one value takes. */
  readonly size: number;
  /** The bytes from one value to the next in an array of them. */
  readonly stride: number;
  /** The byte offset of each field of a struct. */
  readonly offsets: Schema extends d.WgslStruct<infer Props>
    ? { readonly [Key in keyof Props]: number }
    : Readonly<Record<string, never>>;
  /** Writes `value` at `offset`, as WGSL reads it. */
  readonly write: (
    view: DataView,
    offset: number,
    value: EffectInput<Schema>,
  ) => void;
}

/**
 * A value that an `EffectData` of `Schema` writes. It is `d.InferInput`, but
 * an array is an array of values, not a typed array of their words.
 *
 * @internal
 */
export type EffectInput<Schema> =
  Schema extends d.WgslArray<infer Element>
    ? readonly EffectInput<Element>[]
    : Schema extends d.WgslStruct<infer Props>
      ? { [Key in keyof Props]: EffectInput<Props[Key]> }
      : d.InferInput<Schema>;

/**
 * A buffer that holds a value of `Schema`, bound as `Usage`. A bind group
 * layout takes only a buffer of the schema and the usage of its entry.
 *
 * @internal
 */
export interface EffectBuffer<
  Schema extends d.AnyWgslData,
  Usage extends "uniform" | "storage",
> {
  readonly buffer: GPUBuffer;
  readonly usage: Usage;
  /** Only a type: the schema of the buffer. */
  readonly [schemaOf]?: Schema;
}
