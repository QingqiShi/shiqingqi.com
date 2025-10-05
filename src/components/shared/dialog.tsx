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
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Control rendering - keep dialog in DOM during close animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Cancel any pending close
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    } else {
      // Delay unmount to allow exit animation
      const duration = window.innerWidth >= 768 ? 200 : 300;
      closeTimeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        const dialog = dialogRef.current;
        if (dialog?.open) {
          dialog.close();
        }
      }, duration);
      return () => {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
        }
      };
    }
  });

  // Handle showModal when dialog should be visible
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !shouldRender) return;

    if (!dialog.open) {
      dialog.showModal();
    }
  });

  // Handle close event (Escape key)
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
            animation-duration: 300ms;
          }
          ::view-transition-old(${id}-dialog) {
            animation-name: ${slideOutMobile};
            animation-duration: 300ms;
          }

          @media (min-width: 768px) {
            ::view-transition-new(${id}-dialog) {
              animation-name: ${fadeScaleIn};
              animation-duration: 200ms;
            }
            ::view-transition-old(${id}-dialog) {
              animation-name: ${fadeScaleOut};
              animation-duration: 200ms;
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
        style={{ viewTransitionName: isOpen ? `${id}-dialog` : undefined }}
      >
        <Button
          css={styles.closeButton}
          icon={<XIcon />}
          onClick={onClose}
          autoFocus
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
