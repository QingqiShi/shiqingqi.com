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
import { viewportAnchor, viewportFill } from "../primitives/layout.stylex.ts";
import { color, layer, space } from "../tokens.stylex.ts";
import { Button } from "./button.tsx";
import { CloseIcon } from "./close-icon.tsx";
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
   * tabbable element inside the dialog (the close button).
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
 * Full-screen, ViewTransition-driven overlay for immersive content (e.g.
 * embedded video) that owns focus trapping, scroll locking, Escape-to-close,
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
  // The shell mounts eagerly so the dialog's ViewTransition has a live parent
  // to enter into. Deferring past hydration keeps server and client render in
  // agreement, since the server renders nothing here.
  const isHydrated = useIsHydrated();
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogFocus({
    isOpen: deferredIsOpen,
    dialogRef,
    onClose,
    initialFocusRef,
  });

  // `undefined` means "use the default target"; `null` means the caller is
  // still resolving one, so hold rendering.
  const usingDefaultTarget = portalTarget === undefined;
  const resolvedTarget = usingDefaultTarget
    ? typeof document === "undefined"
      ? null
      : document.body
    : portalTarget;

  if (!isHydrated || !resolvedTarget) {
    return null;
  }

  // React only animates a ViewTransition that is itself the root of what
  // mounts or unmounts; a host element inserted alongside it kills the
  // transition. Keeping this shell always mounted keeps the ViewTransition as
  // that root.
  const overlay = (
    <>
      {/* Gated rather than kept, so a closed overlay never intercepts a click. */}
      {deferredIsOpen ? (
        <div
          css={[viewportFill.absolute, styles.backdrop]}
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      {/* The blur stays out of any named ViewTransition group: a group
          captures the element apart from the page it filters, leaving the
          blur with no backdrop during the transition. It melts in and out
          via `isShown` instead, alongside the dialog's slide. */}
      <ProgressiveBlur
        css={[viewportFill.absolute, styles.blur]}
        isShown={deferredIsOpen}
      >
        {deferredIsOpen ? (
          <ViewTransition enter="slide-in" exit="slide-out">
            {/* forwardProps makes RemoveScroll clone its child and inject its
                own ref, which would clobber a ref placed directly on the
                dialog div. Passing the ref through RemoveScroll instead keeps
                `dialogRef` working for focus and the Tab trap. */}
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
                {/* `Button` sets its own `position: relative` for its busy
                    spinner, which a caller's `position: absolute` can't
                    reliably outrank. Pin the corner from this wrapper
                    instead, which owns only placement. */}
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
    // The layers below need only a viewport-anchored containing block. An
    // explicit `portalTarget` is assumed to already be one; `document.body`
    // (statically positioned) is not, so it gets wrapped.
    usingDefaultTarget ? (
      <div css={[viewportAnchor.fixed, styles.positioningRoot]}>{overlay}</div>
    ) : (
      overlay
    ),
    resolvedTarget,
  );
}

const styles = stylex.create({
  // `position: fixed` opens a stacking context here, so the backdrop's and
  // dialog's z-index can't escape it. Removing it risks the overlay painting
  // under app chrome that claims its own plane (a fixed header, a sticky
  // rail).
  positioningRoot: {
    zIndex: layer.overlay,
    // The root stays mounted while the overlay is closed, so it must let
    // every click through.
    pointerEvents: "none",
  },
  // The blur, backdrop, and dialog share one z-index: DOM order already
  // stacks the blur (dialog included) over the backdrop. Sharing keeps all
  // three on the overlay plane without outranking a tooltip or toast.
  blur: {
    zIndex: layer.overlay,
  },
  // Invisible: it only catches the dismissal click, which falls through the
  // blur's click-through layers to reach it.
  backdrop: {
    zIndex: layer.overlay,
    pointerEvents: "all",
  },
  closeButtonCorner: {
    position: "absolute",
    insetInlineEnd: { default: space._2, [breakpoints.md]: space._5 },
    insetBlockStart: { default: space._2, [breakpoints.md]: space._5 },
    // Above the consumer's content, since the close affordance is the
    // overlay's own chrome, not the consumer's.
    zIndex: layer.content,
  },
  content: {
    position: "absolute",
    insetBlockStart: space._8,
    insetInlineStart: 0,
    inlineSize: "calc(100vw - var(--removed-body-scroll-bar-size, 0px))",
    blockSize: `calc(100dvh - ${space._8})`,
    backgroundColor: color.bgSurface,
    zIndex: layer.overlay,
    overflow: "hidden",
    pointerEvents: "all",
  },
});
