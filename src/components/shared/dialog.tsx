// @inferEffectDependencies
"use client";

import { XIcon } from "@phosphor-icons/react/X";
import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";
import { breakpoints } from "@/breakpoints.stylex";
import { useCssId } from "@/hooks/use-css-id";
import { border, color, layer, shadow, space } from "@/tokens.stylex";
import { Button } from "./button";

const ANIMATION_DURATION = {
  MOBILE: 300,
  DESKTOP: 200,
} as const;

const MOBILE_BREAKPOINT = 768;

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel?: string;
}

export function Dialog({
  children,
  isOpen,
  onClose,
  ariaLabel,
}: PropsWithChildren<DialogProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useCssId();
  const [shouldRender, setShouldRender] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [animationDuration, setAnimationDuration] = useState<number>(
    ANIMATION_DURATION.DESKTOP,
  );

  // Detect viewport size for animation duration (client-side only)
  useEffect(() => {
    const updateDuration = () => {
      setAnimationDuration(
        window.innerWidth < MOBILE_BREAKPOINT
          ? ANIMATION_DURATION.MOBILE
          : ANIMATION_DURATION.DESKTOP,
      );
    };

    updateDuration();
    window.addEventListener("resize", updateDuration);
    return () => window.removeEventListener("resize", updateDuration);
  });

  // Control dialog lifecycle and cleanup
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    } else if (shouldRender) {
      closeTimeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        const dialog = dialogRef.current;
        if (dialog?.open) {
          try {
            dialog.close();
          } catch (error) {
            console.error("Failed to close dialog:", error);
          }
        }
      }, animationDuration);
    }

    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  });

  // Handle showModal when dialog mounts
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !shouldRender) return;

    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch (error) {
        console.error("Failed to show dialog:", error);
      }
    }
  });

  // Handle native close events (Escape key, programmatic close)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("close", onClose);
    };
  });

  if (!shouldRender) return null;

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Check if click target is the dialog element itself (backdrop area)
    if (event.target === dialog) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop styling and view transition animations */}
      <style>
        {`
          dialog::backdrop {
            background-color: rgba(0, 0, 0, 0.7);
          }

          ::view-transition-new(${id}-dialog) {
            animation-name: ${slideInMobile};
            animation-duration: ${ANIMATION_DURATION.MOBILE}ms;
          }
          ::view-transition-old(${id}-dialog) {
            animation-name: ${slideOutMobile};
            animation-duration: ${ANIMATION_DURATION.MOBILE}ms;
          }

          @media (min-width: ${MOBILE_BREAKPOINT}px) {
            ::view-transition-new(${id}-dialog) {
              animation-name: ${fadeScaleIn};
              animation-duration: ${ANIMATION_DURATION.DESKTOP}ms;
            }
            ::view-transition-old(${id}-dialog) {
              animation-name: ${fadeScaleOut};
              animation-duration: ${ANIMATION_DURATION.DESKTOP}ms;
            }
          }
        `}
      </style>
      <dialog
        ref={dialogRef}
        css={styles.dialog}
        onClick={handleBackdropClick}
        aria-label={ariaLabel}
        aria-modal="true"
        style={{
          viewTransitionName: shouldRender ? `${id}-dialog` : undefined,
        }}
      >
        <Button
          css={styles.closeButton}
          icon={<XIcon />}
          onClick={onClose}
          autoFocus
          aria-label={ariaLabel ? `Close ${ariaLabel}` : "Close dialog"}
        />
        {children}
      </dialog>
    </>
  );
}

// Mobile slide animations
const slideInMobile = stylex.keyframes({
  from: {
    transform: "translateY(100dvh)",
  },
});

const slideOutMobile = stylex.keyframes({
  to: {
    transform: "translateY(100dvh)",
  },
});

// Desktop fade + scale animations
const fadeScaleIn = stylex.keyframes({
  from: {
    opacity: 0,
    transform: "scale(0.95)",
  },
});

const fadeScaleOut = stylex.keyframes({
  to: {
    opacity: 0,
    transform: "scale(0.95)",
  },
});

const styles = stylex.create({
  dialog: {
    // Reset default dialog styles
    borderWidth: 0,
    borderStyle: "none",
    padding: 0,
    margin: 0,

    // Common styles
    backgroundColor: color.backgroundRaised,
    overflow: "hidden",
    boxShadow: shadow._6,
    zIndex: layer.tooltip,

    // Responsive positioning
    position: "fixed",

    // Mobile: flyout from bottom
    bottom: {
      default: 0,
      [breakpoints.md]: "auto",
    },
    left: {
      default: 0,
      [breakpoints.md]: "50%",
    },
    right: {
      default: 0,
      [breakpoints.md]: "auto",
    },
    top: {
      default: "auto",
      [breakpoints.md]: "50%",
    },
    width: {
      default: "100dvw",
      [breakpoints.md]: "90vw",
    },
    maxWidth: {
      default: "none",
      [breakpoints.md]: "720px",
    },
    maxHeight: {
      default: "90dvh",
      [breakpoints.md]: "none",
    },

    // Responsive transform
    transform: {
      default: "none",
      [breakpoints.md]: "translate(-50%, -50%)",
    },

    // Border radius: rounded top on mobile, fully rounded on desktop
    borderTopLeftRadius: border.radius_4,
    borderTopRightRadius: border.radius_4,
    borderBottomLeftRadius: {
      default: 0,
      [breakpoints.md]: border.radius_4,
    },
    borderBottomRightRadius: {
      default: 0,
      [breakpoints.md]: border.radius_4,
    },
  },
  closeButton: {
    position: "absolute",
    right: { default: space._2, [breakpoints.md]: space._5 },
    top: { default: space._2, [breakpoints.md]: space._5 },
    zIndex: 1,
  },
});
