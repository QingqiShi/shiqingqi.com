"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { getFocusableElements } from "../utils/focusable.ts";
import { useControlled } from "./use-controlled.ts";

type PopoverSide = "top" | "right" | "bottom" | "left";
type PopoverAlign = "start" | "end";

/** Side the popover hangs off, optionally aligned to one of the anchor's edges. */
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

interface PopoverOptions {
  /** Controlled open state. Omit to let the hook own it. */
  open?: boolean;
  /** Initial open state when uncontrolled. Defaults to `false`. */
  defaultOpen?: boolean;
  /** Called with the next state on every open or close. */
  onOpenChange?: (open: boolean) => void;
  /** Preferred side and alignment. Defaults to `"bottom-start"`. */
  placement?: PopoverPlacement;
  /** Gap between anchor and popover, in pixels. Defaults to `8`. */
  offset?: number;
}

/** Spread onto the element that opens the popover. */
export interface PopoverTriggerProps {
  id: string;
  type: "button";
  ref: RefObject<HTMLButtonElement | null>;
  "aria-expanded": boolean;
  "aria-haspopup": "dialog";
  "aria-controls": string | undefined;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/** Spread onto the popup element. Must be positioned `fixed`. */
export interface PopoverContentProps {
  id: string;
  ref: RefObject<HTMLDivElement | null>;
  role: "dialog";
  tabIndex: -1;
  "aria-labelledby": string;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

// Gutter kept between the popover and each viewport edge. Paired with the
// `space._1` cap on the surface — equal at a 16px root, near enough above it.
const VIEWPORT_PADDING = 8;

/**
 * Headless anchored-popup behaviour: open state, viewport-aware placement, the
 * dismissal rules (Escape, outside pointer, focus leaving), and the ARIA wiring
 * that makes a trigger a popover trigger. It moves focus into the popup on open
 * and hands it back to the trigger if the popup still holds it when it closes,
 * but it never traps focus and never locks scroll — that is `Overlay`'s job.
 *
 * This is the custom layer beneath the `Popover` component: reach for it when
 * the popup needs to be something other than a plain surface, and spread
 * `triggerProps` onto the anchor and `contentProps` onto the popup. The trigger
 * is typed as a `<button>` announcing a dialog — a listbox or menu trigger
 * needs its own `aria-haspopup` and element type, which this does not yet take.
 *
 * The popup element must be `position: fixed`: the hook writes its `top`/`left`
 * straight to the node so a scroll gesture repositions it without re-rendering.
 *
 * @returns `{ open, setOpen, toggle, triggerProps, contentProps }`.
 */
export function usePopover({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  placement = "bottom-start",
  offset = 8,
}: PopoverOptions = {}) {
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const contentId = `${baseId}-content`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Focus lives inside a popup that unmounts on close, so whether it was ours
  // to give back has to be known before the node goes away.
  const ownsFocusRef = useRef(false);

  const [open, setInternalOpen] = useControlled({
    controlled,
    defaultValue: defaultOpen,
  });

  const setOpen = useCallback(
    (next: boolean) => {
      setInternalOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange, setInternalOpen],
  );

  const toggle = useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const content = contentRef.current;
    if (!open || !trigger || !content) return;

    const position = () => {
      const rtl = getComputedStyle(trigger).direction === "rtl";
      // A portalled popup inherits the document's direction, not the anchor's,
      // so carry it across or RTL content lays out backwards. Written only on a
      // change: `dir` doesn't diff, and the layout reads below would then have
      // to force a fresh layout on every reposition.
      const dir = rtl ? "rtl" : "ltr";
      if (content.dir !== dir) content.dir = dir;
      const { top, left } = computePopoverPosition({
        anchor: trigger.getBoundingClientRect(),
        // Layout size, not the visual box: the entry animation scales the popup,
        // and a transformed rect would feed the maths a moving target.
        popover: { width: content.offsetWidth, height: content.offsetHeight },
        placement,
        offset,
        viewport: {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
        },
        padding: VIEWPORT_PADDING,
        rtl,
      });
      content.style.top = `${String(top)}px`;
      content.style.left = `${String(left)}px`;
    };

    // Momentum scrolling delivers events faster than the compositor paints, so
    // repositioning per event would force a document-wide layout each time.
    // Scroll fires before the frame's rendering step, so this still lands in
    // the same paint.
    let frame = 0;
    const schedule = () => {
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        position();
      });
    };

    position();
    // Capture phase, so a scroll in any nested container repositions it too.
    window.addEventListener("scroll", schedule, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", schedule);
    // A popup measured once at open keeps that placement even if async content
    // or a validation message later grows it past the edge it was flipped to
    // fit. Absent in jsdom, hence the guard.
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedule);
    observer?.observe(trigger);
    observer?.observe(content);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [open, placement, offset]);

  useLayoutEffect(() => {
    if (!open) return;
    const content = contentRef.current;
    // Captured for the cleanup: the popup unmounts before it runs, and the
    // trigger outlives every open/close cycle.
    const trigger = triggerRef.current;
    if (!content) return;

    // Per the WAI-ARIA non-modal dialog pattern, opening moves focus in — with
    // a portalled popup nothing else would put it within Tab's reach.
    // `.at`, not destructuring: an empty list is the common case (a popover of
    // plain text), and indexing would type the miss away.
    (getFocusableElements(content).at(0) ?? content).focus();
    // Set here rather than from the `focusin` listener below, which is a passive
    // effect and so isn't attached yet when this focus lands.
    ownsFocusRef.current = true;

    return () => {
      if (!ownsFocusRef.current) return;
      ownsFocusRef.current = false;
      trigger?.focus();
    };
  }, [open]);

  const dismiss = useEffectEvent(() => {
    setOpen(false);
  });

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (contentRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      // Focus hasn't moved yet, so leave `ownsFocusRef` alone: closing hands it
      // back to the trigger, then the browser's own click handling moves it on
      // to whatever was clicked.
      dismiss();
    };

    // Watched on the document rather than as a blur on either element, so it
    // reads the same whether focus started on the trigger or inside the popup,
    // and whether it moved by Tab or by script. It only observes — nothing here
    // moves focus, so the popup still never traps it.
    const handleFocusIn = (event: globalThis.FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (contentRef.current?.contains(target)) return;
      // The popup no longer holds focus, so closing must not yank it back.
      ownsFocusRef.current = false;
      // Focus landing on `<body>` was dropped rather than moved on, and the
      // trigger is still part of the popover; neither is a departure.
      if (target === document.body) return;
      if (triggerRef.current?.contains(target)) return;
      dismiss();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("focusin", handleFocusIn, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
    };
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape" || !open) return;
    // Stop here so an enclosing dialog doesn't close on the same keystroke.
    event.stopPropagation();
    setOpen(false);
    triggerRef.current?.focus();
  };

  const triggerProps: PopoverTriggerProps = {
    id: triggerId,
    type: "button",
    ref: triggerRef,
    "aria-expanded": open,
    "aria-haspopup": "dialog",
    // Only while open: the popup unmounts on close, and an `aria-controls`
    // pointing at nothing is worse than none at all.
    "aria-controls": open ? contentId : undefined,
    onClick: toggle,
    onKeyDown: handleKeyDown,
  };

  const contentProps: PopoverContentProps = {
    id: contentId,
    ref: contentRef,
    role: "dialog",
    tabIndex: -1,
    "aria-labelledby": triggerId,
    onKeyDown: handleKeyDown,
  };

  return { open, setOpen, toggle, triggerProps, contentProps };
}
