import type { SharedElement, SharedForm } from "../../motion/fly-shared.ts";

/**
 * An element that a Shared element shows in: an HTML element, or a part of
 * an SVG drawing, such as the line of a chart.
 *
 * @internal
 */
export type SplitViewMarkElement = SharedElement;

/**
 * How a Shared element flies.
 *
 * @internal
 */
export interface SplitViewFlightOptions {
  /**
   * `"cross"` cross-fades its two forms. `"dip"` fades it out most of the
   * way at the middle of its flight and back in as it lands, for a label
   * that rides along with a part that changes shape, such as the value at
   * the top of a chart.
   */
  readonly fade?: "cross" | "dip";
}

/**
 * What changed in a composition of the view, as the URL tells it.
 *
 * @internal
 */
export interface SplitViewChange {
  /** The content went one column deeper, came back one, or showed other content at the same depth. */
  readonly content: "push" | "pop" | "swap" | null;
  /**
   * The part of the sidebar in a push or a pop, where the sidebar is a page of
   * the stack. `"back"`: a page of the content goes in or out over it.
   * `"front"`: it goes in or out over the content. `null`: it has no part.
   */
  readonly stackRoot: "front" | "back" | null;
  /** The detail came, went, or showed other content. */
  readonly detail: "in" | "out" | "swap" | null;
}

/**
 * Where each Shared element shows before a change, read when a navigation
 * is about to change the DOM.
 *
 * @internal
 */
export interface SplitViewSnapshot {
  /** The boxes of the Shared elements, from the top-left corner of the view at `origin`. */
  readonly marks: ReadonlyMap<string, ShownMark>;
  /** Where the top-left corner of the view was in the viewport. */
  readonly origin: { readonly x: number; readonly y: number } | null;
}

/** @internal */
export interface ShownMark extends SharedForm {
  readonly options: SplitViewFlightOptions;
}

/**
 * What the view does when the motion ends, and the paint it lends the
 * motion.
 *
 * @internal
 */
export interface SplitViewMotionEvents {
  /** Every motion up to `motion`, the one that played last, has stopped, so the view can let go of what left. */
  onSettled: (motion: number) => void;
  /** The motion has drawn a frame, so the Shared elements show at other places. */
  onFrame: () => void;
}

/**
 * A part of the motion, such as the push of a page or one flight.
 *
 * @internal
 */
export interface Part {
  /** Whether a value of the part still moves. */
  isMoving(): boolean;
  /** Stops the part and takes off every style it wrote. */
  drop(): void;
}

/**
 * The elements that each Shared element shows in, by name, with how each
 * flies.
 *
 * @internal
 */
export type SplitViewMarks = Map<
  string,
  Map<SplitViewMarkElement, SplitViewFlightOptions>
>;
