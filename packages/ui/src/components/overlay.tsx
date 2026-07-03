"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useDeferredValue,
  useRef,
  ViewTransition,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { RemoveScroll } from "react-remove-scroll";
import { breakpoints } from "../breakpoints.stylex.ts";
import { useDialogFocus } from "../hooks/use-dialog-focus.ts";
import { border, color, layer, space } from "../tokens.stylex.ts";
import { Button } from "./button.tsx";

interface OverlayProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Accessible label for the close button. Required — the package ships no
   * i18n, so the consumer supplies the localized string (config layer).
   */
  closeLabel: string;
  /** Icon rendered inside the close button. Defaults to a plain "×" glyph. */
  closeIcon?: ReactNode;
  /**
   * Where to render the portal. Defaults to `document.body`. Pass an explicit
   * target (e.g. an app-managed portal root) to scope the overlay; pass `null`
   * to defer rendering until a target is available.
   */
  portalTarget?: Element | DocumentFragment | null;
  "aria-label"?: string;
}

/**
 * Full-screen, ViewTransition-driven overlay for immersive content such as
 * embedded video players. Owns focus trapping, scroll locking, Escape-to-close,
 * and the backdrop; the consumer supplies the content and the localized close
 * label. For a bounded, centred dialog prefer a dedicated sheet component.
 */
export function Overlay({
  children,
  isOpen,
  onClose,
  closeLabel,
  closeIcon,
  portalTarget,
  "aria-label": ariaLabel,
}: PropsWithChildren<OverlayProps>) {
  const deferredIsOpen = useDeferredValue(isOpen);
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogFocus({
    isOpen: deferredIsOpen,
    dialogRef,
    onClose,
  });

  // `undefined` means "use the default target"; an explicit `null` means the
  // caller is still resolving one, so hold rendering until it arrives.
  const usingDefaultTarget = portalTarget === undefined;
  const resolvedTarget = usingDefaultTarget
    ? typeof document === "undefined"
      ? null
      : document.body
    : portalTarget;

  if (!deferredIsOpen || !resolvedTarget) {
    return null;
  }

  const overlay = (
    <>
      <ViewTransition>
        <div css={styles.backdrop} onClick={onClose} aria-hidden="true" />
      </ViewTransition>
      <ViewTransition enter="slide-in" exit="slide-out">
        <RemoveScroll enabled={deferredIsOpen} allowPinchZoom forwardProps>
          <div
            ref={dialogRef}
            css={styles.content}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
          >
            <Button
              css={styles.closeButton}
              icon={closeIcon ?? <span aria-hidden="true">×</span>}
              aria-label={closeLabel}
              onClick={onClose}
            />
            {children}
          </div>
        </RemoveScroll>
      </ViewTransition>
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
  positioningRoot: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: color.bgScrim,
    zIndex: layer.tooltip,
    pointerEvents: "all",
  },
  closeButton: {
    position: "absolute",
    right: { default: space._2, [breakpoints.md]: space._5 },
    top: { default: space._2, [breakpoints.md]: space._5 },
  },
  content: {
    position: "absolute",
    top: space._8,
    left: 0,
    width: "calc(100% - var(--removed-body-scroll-bar-size, 0px))",
    height: `calc(100% - ${space._8})`,
    backgroundColor: color.bgSurface,
    zIndex: layer.tooltip,
    borderRadius: border.radius_4,
    overflow: "hidden",
    pointerEvents: "all",
  },
});
