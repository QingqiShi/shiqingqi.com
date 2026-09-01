type PopoverSide = "top" | "right" | "bottom" | "left";
type PopoverAlign = "start" | "end";

/**
 * Side the popover hangs off, optionally aligned to one of the anchor's edges.
 *
 * @internal
 */
export type PopoverPlacement = PopoverSide | `${PopoverSide}-${PopoverAlign}`;

/** The subset of `DOMRect` the placement maths reads. */
interface AnchorRect {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

interface Size {
  readonly width: number;
  readonly height: number;
}

interface PopoverPositionOptions {
  /** Viewport-relative box of the element the popover hangs off. */
  readonly anchor: AnchorRect;
  /** Untransformed layout size of the popover box. */
  readonly popover: Size;
  readonly placement: PopoverPlacement;
  /** Gap between the anchor and the popover, in pixels. */
  readonly offset: number;
  readonly viewport: Size;
  /** Smallest gap kept between the popover and each viewport edge, in pixels. */
  readonly padding: number;
  /** Mirrors `-start`/`-end` alignment on the block sides. */
  readonly rtl: boolean;
}

const PLACEMENTS: Record<
  PopoverPlacement,
  { side: PopoverSide; align: PopoverAlign | "center" }
> = {
  top: { side: "top", align: "center" },
  "top-start": { side: "top", align: "start" },
  "top-end": { side: "top", align: "end" },
  right: { side: "right", align: "center" },
  "right-start": { side: "right", align: "start" },
  "right-end": { side: "right", align: "end" },
  bottom: { side: "bottom", align: "center" },
  "bottom-start": { side: "bottom", align: "start" },
  "bottom-end": { side: "bottom", align: "end" },
  left: { side: "left", align: "center" },
  "left-start": { side: "left", align: "start" },
  "left-end": { side: "left", align: "end" },
};

const OPPOSITE_SIDE: Record<PopoverSide, PopoverSide> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

const OPPOSITE_ALIGN: Record<PopoverAlign, PopoverAlign> = {
  start: "end",
  end: "start",
};

function clamp(value: number, min: number, max: number) {
  return max < min ? min : Math.min(Math.max(value, min), max);
}

function alignCrossAxis(
  align: PopoverAlign | "center",
  anchorStart: number,
  anchorSize: number,
  popoverSize: number,
  mirror: boolean,
) {
  const resolved = mirror && align !== "center" ? OPPOSITE_ALIGN[align] : align;
  if (resolved === "start") return anchorStart;
  if (resolved === "end") return anchorStart + anchorSize - popoverSize;
  return anchorStart + (anchorSize - popoverSize) / 2;
}

function positionFor(
  side: PopoverSide,
  align: PopoverAlign | "center",
  { anchor, popover, offset, rtl }: PopoverPositionOptions,
) {
  if (side === "top" || side === "bottom") {
    return {
      top:
        side === "top"
          ? anchor.top - popover.height - offset
          : anchor.bottom + offset,
      left: alignCrossAxis(
        align,
        anchor.left,
        anchor.width,
        popover.width,
        rtl,
      ),
    };
  }
  return {
    top: alignCrossAxis(
      align,
      anchor.top,
      anchor.height,
      popover.height,
      false,
    ),
    left:
      side === "left"
        ? anchor.left - popover.width - offset
        : anchor.right + offset,
  };
}

function overflowsSide(
  side: PopoverSide,
  position: { top: number; left: number },
  { popover, viewport, padding }: PopoverPositionOptions,
) {
  switch (side) {
    case "top": {
      return position.top < padding;
    }
    case "bottom": {
      return position.top + popover.height > viewport.height - padding;
    }
    case "left": {
      return position.left < padding;
    }
    case "right": {
      return position.left + popover.width > viewport.width - padding;
    }
  }
}

/**
 * Viewport coordinates for an anchored popover: the requested side flips to its
 * opposite when it would overflow and the opposite fits, then both axes shift to
 * keep the box on screen. Pure — no DOM reads — so the placement rules are
 * testable without a layout engine.
 *
 * @returns `top`/`left` for a `position: fixed` box, plus the side actually used.
 *
 * @internal
 */
export function computePopoverPosition(options: PopoverPositionOptions) {
  const { align } = PLACEMENTS[options.placement];

  let side = PLACEMENTS[options.placement].side;
  let position = positionFor(side, align, options);
  if (overflowsSide(side, position, options)) {
    const flipped = OPPOSITE_SIDE[side];
    const flippedPosition = positionFor(flipped, align, options);
    if (!overflowsSide(flipped, flippedPosition, options)) {
      side = flipped;
      position = flippedPosition;
    }
  }

  const { popover, viewport, padding } = options;
  return {
    top: clamp(
      position.top,
      padding,
      viewport.height - popover.height - padding,
    ),
    left: clamp(
      position.left,
      padding,
      viewport.width - popover.width - padding,
    ),
    side,
    align,
  };
}
