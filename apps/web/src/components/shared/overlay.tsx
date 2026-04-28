"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import {
  useDeferredValue,
  useRef,
  ViewTransition,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";
import { RemoveScroll } from "react-remove-scroll";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { usePortalTarget } from "#src/contexts/portal-context.tsx";
import { useDialogFocus } from "#src/hooks/use-dialog-focus.ts";
import { t } from "#src/i18n.ts";
import { border, color, layer, space } from "#src/tokens.stylex.ts";
import { Button } from "./button";

interface OverlayProps {
  isOpen: boolean;
  onClose: () => void;
  "aria-label"?: string;
}

/**
 * Full-screen, ViewTransition-driven overlay used for immersive content such
 * as embedded video trailers. This is intentionally distinct from
 * `DetailOverlay` (ai-chat/detail-overlay.tsx), which is a centred bottom-sheet
 * dialog with CSS keyframe animations, a focus-trapping close button, and a
 * bounded card. Prefer `DetailOverlay` for panel/detail content; use `Overlay`
 * only when the content should occupy the full viewport with React
 * ViewTransition-based enter/exit.
 */
export function Overlay({
  children,
  isOpen,
  onClose,
  "aria-label": ariaLabel,
}: PropsWithChildren<OverlayProps>) {
  const portalTarget = usePortalTarget();
  const deferredIsOpen = useDeferredValue(isOpen);
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogFocus({
    isOpen: deferredIsOpen,
    dialogRef,
    onClose,
  });

  if (!deferredIsOpen || !portalTarget) {
    return null;
  }

  return createPortal(
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
              icon={<XIcon role="presentation" />}
              aria-label={t({ en: "Close", zh: "关闭" })}
              onClick={onClose}
            />
            {children}
          </div>
        </RemoveScroll>
      </ViewTransition>
    </>,
    portalTarget,
  );
}

const styles = stylex.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
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
    backgroundColor: color.backgroundRaised,
    zIndex: layer.tooltip,
    borderRadius: border.radius_4,
    overflow: "hidden",
    pointerEvents: "all",
  },
});
