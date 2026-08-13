"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useDeferredValue,
  useRef,
  ViewTransition,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { RemoveScroll } from "react-remove-scroll";
import { breakpoints } from "../breakpoints.stylex.ts";
import { useDialogFocus } from "../hooks/use-dialog-focus.ts";
import { useIsHydrated } from "../hooks/use-is-hydrated.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { color, layer, space } from "../tokens.stylex.ts";
import { Button } from "./button.tsx";
import { ProgressiveBlur } from "./progressive-blur.tsx";

interface OverlayBaseProps {
  /** Whether the overlay is shown. */
  isOpen: boolean;
  /**
   * Called when the user requests dismissal — Escape, a backdrop click, or
   * the close button. The consumer owns the open state.
   */
  onClose: () => void;
  /**
   * Accessible label for the close button. Required — the package ships no
   * i18n, so the consumer supplies the localized string (config layer).
   */
  closeLabel: string;
  /** Icon rendered inside the close button. Defaults to the built-in X icon. */
  closeIcon?: ReactNode;
  /**
   * Where to render the portal. Defaults to `document.body`. Pass an explicit
   * target (e.g. an app-managed portal root) to scope the overlay; pass `null`
   * to defer rendering until a target is available.
   */
  portalTarget?: Element | DocumentFragment | null;
  /**
   * Element to focus when the overlay opens. Falls back to the first
   * focusable element inside the dialog (the close button).
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * A modal dialog must have an accessible name (WCAG 4.1.2), so exactly one of
 * `aria-label` / `aria-labelledby` is required at the type level.
 */
type OverlayLabelProps =
  | {
      /** Accessible name for the dialog. */
      "aria-label": string;
      "aria-labelledby"?: undefined;
    }
  | {
      "aria-label"?: undefined;
      /** Id of a visible element that names the dialog. */
      "aria-labelledby": string;
    };

type OverlayProps = OverlayBaseProps & OverlayLabelProps;

/**
 * Inline X icon matching the Phosphor "X" metrics (256 viewBox,
 * 16-unit round-capped strokes, 1em box) so the default close affordance
 * renders identically without the icon dependency. Decorative — the close
 * button carries the accessible name via `closeLabel`.
 */
function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 256 256"
      fill="none"
    >
      <path
        d="M56 56 200 200M200 56 56 200"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Full-screen, ViewTransition-driven overlay for immersive content such as
 * embedded video players. Owns focus trapping, scroll locking, Escape-to-close,
 * and the backdrop; the consumer supplies the content and the localized close
 * label. For bounded, centred content prefer a dedicated dialog component.
 */
export function Overlay({
  children,
  isOpen,
  onClose,
  closeLabel,
  closeIcon,
  portalTarget,
  initialFocusRef,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: PropsWithChildren<OverlayProps>) {
  const deferredIsOpen = useDeferredValue(isOpen);
  // The shell below mounts eagerly so the dialog's ViewTransition has a live
  // parent to enter into, and the server rendered nothing there — deferring
  // past hydration keeps the server and client render in agreement.
  const isHydrated = useIsHydrated();
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogFocus({
    isOpen: deferredIsOpen,
    dialogRef,
    onClose,
    initialFocusRef,
  });

  // `undefined` means "use the default target"; an explicit `null` means the
  // caller is still resolving one, so hold rendering until it arrives.
  const usingDefaultTarget = portalTarget === undefined;
  const resolvedTarget = usingDefaultTarget
    ? typeof document === "undefined"
      ? null
      : document.body
    : portalTarget;

  if (!isHydrated || !resolvedTarget) {
    return null;
  }

  // The shell — backdrop plane, blur box, positioning root — stays mounted
  // while the overlay is closed, and only the ViewTransition around the dialog
  // mounts and unmounts. React activates an enter or exit only when the
  // ViewTransition is itself the root of what got inserted or deleted; with a
  // host element above it in the same insertion the whole subtree commits as
  // one plain mutation and the slide never runs. Keeping the shell mounted
  // makes the ViewTransition that root on both edges.
  const overlay = (
    <>
      {/* Gated rather than kept, so a closed overlay never intercepts a click. */}
      {deferredIsOpen ? (
        <div css={styles.backdrop} onClick={onClose} aria-hidden="true" />
      ) : null}
      {/* The blur measures the dialog it wraps and radiates from it, so the
          strip of page above the sheet ramps to sharp on its own. The blur
          itself stays out of any named ViewTransition group: a group captures
          the element apart from the page it filters, so the blur would have no
          backdrop for the length of the transition. It melts in and out with
          `isShown` instead, alongside the dialog's slide. */}
      <ProgressiveBlur css={styles.blur} isShown={deferredIsOpen}>
        {deferredIsOpen ? (
          <ViewTransition enter="slide-in" exit="slide-out">
            {/* `forwardProps` makes RemoveScroll clone its single child and inject
                its own ref, which would clobber a `ref` placed directly on the
                dialog div and leave `dialogRef` null (breaking default focus and
                the Tab focus-trap, both of which query `dialogRef.current`). Pass
                the ref through RemoveScroll instead — it forwards onto the child. */}
            <RemoveScroll
              ref={dialogRef}
              enabled={deferredIsOpen}
              allowPinchZoom
              forwardProps
            >
              <div
                css={[corner.radius_4, styles.content]}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
              >
                {/* `Button` anchors its own busy spinner with `position: relative`,
                    which a caller's `position: absolute` can't reliably outrank —
                    the button would land at its static position, offset by the
                    insets, and hang off the dialog's inline-start edge. Pin the
                    corner from a wrapper instead, which owns nothing but placement. */}
                <div css={styles.closeButtonCorner}>
                  <Button
                    icon={closeIcon ?? <CloseIcon />}
                    aria-label={closeLabel}
                    onClick={onClose}
                  />
                </div>
                {children}
              </div>
            </RemoveScroll>
          </ViewTransition>
        ) : null}
      </ProgressiveBlur>
    </>
  );

  return createPortal(
    // The backdrop and dialog are `position: absolute`, so they need a
    // positioned containing block. An explicit `portalTarget` is assumed to
    // supply one (e.g. a fixed full-viewport portal root). When falling back to
    // `document.body` — which is statically positioned — wrap in a fixed,
    // viewport-anchored root so they resolve against the viewport instead of
    // the scrolled document.
    usingDefaultTarget ? (
      <div css={styles.positioningRoot}>{overlay}</div>
    ) : (
      overlay
    ),
    resolvedTarget,
  );
}

const styles = stylex.create({
  // `position: fixed` opens a stacking context, so the backdrop's and dialog's
  // `z-index` can't escape this element — the plane has to sit here or the
  // whole overlay paints wherever DOM order drops it, which is underneath any
  // app chrome that claims a plane of its own (a fixed header, a sticky rail).
  positioningRoot: {
    position: "fixed",
    inset: 0,
    zIndex: layer.overlay,
    // The root is mounted while the overlay is closed, so it must let every
    // click through. `pointer-events` inherits: the backdrop and the dialog
    // switch themselves back on while open.
    pointerEvents: "none",
  },
  // The blur, the backdrop, and the dialog share the overlay plane: they are
  // one surface, and DOM order already paints the blur — dialog and all — over
  // the backdrop behind it. Sharing keeps them all on the overlay plane when an
  // explicit `portalTarget` hosts them directly, without any of them
  // outranking a tooltip or a toast.
  blur: {
    position: "absolute",
    inset: 0,
    zIndex: layer.overlay,
  },
  // Invisible: it only catches the dismissal click, which falls through the
  // blur's click-through layers to reach it. The progressive blur in front of
  // it does the visual work — the page blurs rather than dims.
  backdrop: {
    position: "absolute",
    inset: 0,
    zIndex: layer.overlay,
    pointerEvents: "all",
  },
  closeButtonCorner: {
    position: "absolute",
    insetInlineEnd: { default: space._2, [breakpoints.md]: space._5 },
    insetBlockStart: { default: space._2, [breakpoints.md]: space._5 },
    // Above the consumer's content, which shares the dialog as its containing
    // block: the close affordance is the overlay's own chrome.
    zIndex: layer.content,
  },
  content: {
    position: "absolute",
    insetBlockStart: space._8,
    insetInlineStart: 0,
    width: "calc(100% - var(--removed-body-scroll-bar-size, 0px))",
    height: `calc(100% - ${space._8})`,
    backgroundColor: color.bgSurface,
    zIndex: layer.overlay,
    overflow: "hidden",
    pointerEvents: "all",
  },
});
