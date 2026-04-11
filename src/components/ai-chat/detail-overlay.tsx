"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren, RefObject } from "react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { RemoveScroll } from "react-remove-scroll";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { usePortalTarget } from "#src/contexts/portal-context.tsx";
import { useDialogFocus } from "#src/hooks/use-dialog-focus.ts";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { fixedFill } from "#src/primitives/layout.stylex.ts";
import { motionConstants } from "#src/primitives/motion.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, color, layer, space } from "#src/tokens.stylex.ts";

interface DetailOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  "aria-label": string;
  /**
   * Override the card's max width. Defaults to a wider reading-friendly size
   * suitable for detail content.
   */
  width?: "default" | "narrow";
  /**
   * Override the card's max height. Defaults to `90vh` (`85vh` on md+).
   */
  height?: "default" | "compact";
  /**
   * Hide the built-in floating close button. Use when the consumer renders its
   * own header with a close affordance.
   */
  hideCloseButton?: boolean;
  /**
   * Controls how the card handles overflow.
   * - `"scroll"` (default): the entire card scrolls vertically.
   * - `"flex-column"`: the card becomes a flex column with `overflow: hidden`.
   *   The consumer is responsible for making a child scrollable (e.g. a body
   *   with `flex: 1; overflow-y: auto`).
   */
  layout?: "scroll" | "flex-column";
  /**
   * Ref of the element to focus when the dialog opens. Defaults to the
   * built-in close button (or the first focusable child when
   * `hideCloseButton` is set).
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export function DetailOverlay({
  isOpen,
  onClose,
  "aria-label": ariaLabel,
  width = "default",
  height = "default",
  hideCloseButton = false,
  layout = "scroll",
  initialFocusRef,
  children,
}: PropsWithChildren<DetailOverlayProps>) {
  const portalTarget = usePortalTarget();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogFocus({
    isOpen,
    dialogRef,
    onClose,
    initialFocusRef:
      initialFocusRef ?? (hideCloseButton ? undefined : closeButtonRef),
  });

  if (!isOpen || !portalTarget) {
    return null;
  }

  return createPortal(
    <>
      <div
        css={[fixedFill.all, styles.backdrop]}
        onClick={onClose}
        aria-hidden="true"
      />
      <RemoveScroll allowPinchZoom forwardProps>
        <div css={[fixedFill.all, styles.cardContainer]}>
          <div
            ref={dialogRef}
            css={[
              styles.card,
              width === "narrow" ? styles.cardNarrow : styles.cardDefault,
              height === "compact"
                ? styles.cardCompact
                : styles.cardTallDefault,
              layout === "flex-column"
                ? styles.cardFlexColumn
                : styles.cardScrollable,
            ]}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
          >
            {!hideCloseButton && (
              <button
                ref={closeButtonRef}
                type="button"
                css={[buttonReset.base, flex.inlineCenter, styles.closeButton]}
                onClick={onClose}
                aria-label={t({ en: "Close", zh: "关闭" })}
              >
                <XIcon size={20} aria-hidden="true" />
              </button>
            )}
            {children}
          </div>
        </div>
      </RemoveScroll>
    </>,
    portalTarget,
  );
}

const fadeIn = stylex.keyframes({
  from: { opacity: 0 },
});

const slideUp = stylex.keyframes({
  from: { transform: "translateY(100%)" },
});

const easing = "cubic-bezier(0.32, 0.72, 0, 1)";

const styles = stylex.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: layer.overlay,
    pointerEvents: "all",
    animationName: fadeIn,
    animationDuration: "200ms",
    animationTimingFunction: easing,
    animationFillMode: "backwards",
  },
  cardContainer: {
    zIndex: layer.tooltip,
    pointerEvents: "none",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    padding: space._2,
    paddingTop: space._8,
    [breakpoints.md]: {
      alignItems: "center",
      padding: space._5,
    },
  },
  card: {
    position: "relative",
    width: "100%",
    backgroundColor: color.backgroundRaised,
    borderRadius: border.radius_4,
    pointerEvents: "all",
    animationName: {
      default: slideUp,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    animationDuration: "300ms",
    animationTimingFunction: easing,
    animationFillMode: "backwards",
  },
  cardDefault: {
    maxWidth: { default: "100%", [breakpoints.md]: "min(600px, 90vw)" },
  },
  cardNarrow: {
    maxWidth: { default: "100%", [breakpoints.md]: "min(480px, 90vw)" },
  },
  cardTallDefault: {
    maxHeight: { default: "90vh", [breakpoints.md]: "85vh" },
  },
  cardCompact: {
    maxHeight: { default: "80vh", [breakpoints.md]: "70vh" },
  },
  cardScrollable: {
    overflow: "hidden",
    overflowY: "auto",
  },
  cardFlexColumn: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  closeButton: {
    position: "absolute",
    top: space._2,
    right: space._2,
    zIndex: layer.content,
    width: "2rem",
    height: "2rem",
    borderRadius: border.radius_round,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    color: "white",
    transition: "background-color 0.15s ease",
  },
});
