"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { RemoveScroll } from "react-remove-scroll";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { usePortalTarget } from "#src/contexts/portal-context.tsx";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { fixedFill } from "#src/primitives/layout.stylex.ts";
import { buttonReset } from "#src/primitives/reset.stylex.ts";
import { border, color, layer, space } from "#src/tokens.stylex.ts";
import { MediaDetailContent } from "./media-detail-content";
import { useMediaDetail } from "./media-detail-context";

export function MediaDetailOverlay() {
  const { focusedMedia, setFocusedMedia } = useMediaDetail();
  const portalTarget = usePortalTarget();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!focusedMedia) return;

    triggerRef.current = document.activeElement as HTMLElement | null;
    // Allow the portal to render before focusing
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFocusedMedia(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [focusedMedia, setFocusedMedia]);

  if (!focusedMedia || !portalTarget) {
    return null;
  }

  return createPortal(
    <>
      <div
        css={[fixedFill.all, styles.backdrop]}
        onClick={() => setFocusedMedia(null)}
        aria-hidden="true"
      />
      <RemoveScroll allowPinchZoom forwardProps>
        <div css={[fixedFill.all, styles.cardContainer]}>
          <div
            css={styles.card}
            role="dialog"
            aria-label={focusedMedia.title ?? undefined}
          >
            <button
              ref={closeButtonRef}
              type="button"
              css={[buttonReset.base, flex.inlineCenter, styles.closeButton]}
              onClick={() => setFocusedMedia(null)}
              aria-label={t({ en: "Close", zh: "关闭" })}
            >
              <XIcon size={20} />
            </button>
            <MediaDetailContent
              id={focusedMedia.id}
              mediaType={focusedMedia.mediaType}
              title={focusedMedia.title}
              posterPath={focusedMedia.posterPath}
            />
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
    width: { default: "100%", [breakpoints.md]: "min(600px, 90vw)" },
    maxHeight: { default: "90vh", [breakpoints.md]: "85vh" },
    backgroundColor: color.backgroundRaised,
    borderRadius: border.radius_4,
    overflow: "hidden",
    overflowY: "auto",
    pointerEvents: "all",
    animationName: slideUp,
    animationDuration: "300ms",
    animationTimingFunction: easing,
    animationFillMode: "backwards",
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
