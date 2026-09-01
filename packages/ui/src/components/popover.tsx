"use client";

import * as stylex from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";
import { createPortal } from "react-dom";
import {
  usePopover,
  type PopoverPlacement,
  type PopoverTriggerProps,
} from "../hooks/use-popover.ts";
import type { StyleProp } from "../style-prop.ts";
import { color, layer, space } from "../tokens.stylex.ts";
import { mergeRefs } from "../utils/merge-refs.ts";
import { popoverSurface } from "./popover-surface.stylex.ts";

interface PopoverBaseProps {
  /**
   * Renders the trigger. Spread the supplied props onto whatever element opens
   * the popover — a `Button`, a `Chip`, a bare `<button>` — and they carry the
   * anchor ref, the open state, and the ARIA wiring with them.
   *
   * A callback rather than a node, because the parent has to inject a ref and
   * `aria-*` into an element it doesn't own; cloning an arbitrary node cannot be
   * typed without `any`.
   */
  trigger: (props: PopoverTriggerProps) => ReactNode;
  /** Popover content. Anything — this is not a menu. */
  children: ReactNode;
  /**
   * Preferred side and alignment. Defaults to `"bottom-start"`; the side flips
   * and both axes shift when the viewport would clip the popover.
   */
  placement?: PopoverPlacement;
  /** Gap between trigger and popover, in pixels. Defaults to `8`. */
  offset?: number;
  /**
   * Where to render the portal. Defaults to `document.body` — portalling is
   * what keeps the popover out of a clipping or transformed ancestor. Pass
   * `null` to defer rendering until a target is available.
   */
  portalTarget?: Element | DocumentFragment | null;
  /**
   * Accessible name for the popover. Defaults to naming it by its trigger,
   * which is right whenever the trigger says what the popover is about.
   */
  "aria-label"?: string;
  /** Id of a visible element that names the popover, instead of the trigger. */
  "aria-labelledby"?: string;
  /** StyleX styles merged over the surface — the config-layer escape hatch. */
  css?: StyleProp;
  /** Ref to the popover element. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * A controlled popover whose parent never hears about the toggle is a dead
 * control: `useControlled` hands back a no-op setter while `open` is supplied,
 * so without `onOpenChange` nothing can ever close it.
 */
type PopoverStateProps =
  | {
      /** Controlled open state. Requires `onOpenChange`. */
      open: boolean;
      /** Called with the next state on every open or close. */
      onOpenChange: (open: boolean) => void;
      defaultOpen?: undefined;
    }
  | {
      open?: undefined;
      /** Called with the next state on every open or close. */
      onOpenChange?: (open: boolean) => void;
      /** Initial open state when uncontrolled. Defaults to `false`. */
      defaultOpen?: boolean;
    };

type PopoverProps = PopoverBaseProps & PopoverStateProps;

/**
 * Arbitrary content hung off a trigger, placed against the viewport rather than
 * the trigger's corner: the side flips and the box shifts so it always lands on
 * screen. It closes on Escape, on an outside pointer, and when focus leaves —
 * but it does not trap focus or lock scroll, so the page behind stays usable.
 * For a modal that must take over the page, use `Overlay`; for a menu of
 * commands, `MenuButton`.
 *
 * The popover is portalled and unmounts when closed, so its contents remount on
 * every open — lift any state a consumer needs to keep.
 */
export function Popover({
  trigger,
  children,
  open: controlledOpen,
  defaultOpen,
  onOpenChange,
  placement = "bottom-start",
  offset = 8,
  portalTarget,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  css,
  ref,
}: PopoverProps) {
  const { open, triggerProps, contentProps } = usePopover({
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
    placement,
    offset,
  });

  const {
    ref: contentRef,
    "aria-labelledby": labelledByTrigger,
    ...restContentProps
  } = contentProps;

  // `undefined` means "use the default target"; an explicit `null` means the
  // caller is still resolving one, so hold rendering until it arrives.
  const resolvedTarget =
    portalTarget === undefined
      ? typeof document === "undefined"
        ? null
        : document.body
      : portalTarget;

  return (
    <>
      {trigger(triggerProps)}
      {open && resolvedTarget
        ? createPortal(
            <div
              {...restContentProps}
              ref={mergeRefs(ref, contentRef)}
              aria-label={ariaLabel}
              aria-labelledby={
                ariaLabel === undefined
                  ? (ariaLabelledBy ?? labelledByTrigger)
                  : undefined
              }
              css={[
                styles.content,
                popoverSurface.base,
                popoverSurface.enter,
                css,
              ]}
            >
              {children}
            </div>,
            resolvedTarget,
          )
        : null}
    </>
  );
}

const styles = stylex.create({
  // No `inset` declarations: `usePopover` writes `top`/`left` to the node, and a
  // logical inset left over from the stylesheet would over-constrain it in RTL.
  content: {
    position: "fixed",
    zIndex: layer.tooltip,
    boxSizing: "border-box",
    paddingBlock: space._2,
    paddingInline: space._3,
    // Portalled content inherits from `<body>`, not from the trigger's context.
    color: color.textMain,
    // Caps the box just inside the gutter `usePopover`'s placement maths keeps,
    // so a tall panel scrolls itself rather than running off screen. `contain`
    // stops a flick that reaches the end scrolling the page behind it.
    maxBlockSize: `calc(100dvh - ${space._1} * 2)`,
    maxInlineSize: `calc(100dvw - ${space._1} * 2)`,
    overflowY: "auto",
    overscrollBehavior: "contain",
  },
});
