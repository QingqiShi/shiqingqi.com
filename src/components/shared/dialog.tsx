// @inferEffectDependencies
"use client";

import { XIcon } from "@phosphor-icons/react/X";
import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren } from "react";
import { useRef } from "react";
import { breakpoints } from "@/breakpoints.stylex";
import { border, color, layer, shadow, space } from "@/tokens.stylex";
import { Button } from "./button";

const ANIMATION_DURATION = 300;

interface DialogProps {
  id: string;
  onClose?: () => void;
  ariaLabel?: string;
}

export function Dialog({
  children,
  id,
  onClose,
  ariaLabel,
}: PropsWithChildren<DialogProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <dialog
      ref={dialogRef}
      id={id}
      css={styles.dialog}
      closedby="any"
      onClose={onClose}
      aria-label={ariaLabel}
      aria-modal="true"
    >
      <Button
        css={styles.closeButton}
        icon={<XIcon />}
        commandfor={id}
        command="close"
        aria-label={ariaLabel ? `Close ${ariaLabel}` : "Close dialog"}
      />
      {children}
    </dialog>
  );
}

const styles = stylex.create({
  dialog: {
    // Reset default dialog styles
    borderWidth: 0,
    borderStyle: "none",
    padding: 0,
    margin: 0,

    // Common styles
    backgroundColor: {
      default: color.backgroundRaised,
      // eslint-disable-next-line @stylexjs/valid-styles
      ":open": {
        "::backdrop": {
          default: "rgba(0, 0, 0, 0.7)",
          "@starting-style": "transparent",
        },
      },
      "::backdrop": "transparent",
    },
    overflow: "hidden",
    boxShadow: shadow._6,
    zIndex: layer.overlay,

    // Transitions for backdrop and dialog
    // allow-discrete on display/overlay keeps the dialog/backdrop in the DOM during the animation
    // This allows the backdrop to animate on close and the dialog to complete its exit animation
    transition: {
      default: `transform ${ANIMATION_DURATION}ms ease-out, opacity ${ANIMATION_DURATION}ms ease-out, overlay ${ANIMATION_DURATION}ms ease-out allow-discrete, display ${ANIMATION_DURATION}ms ease-out allow-discrete`,
      "::backdrop": `background-color ${ANIMATION_DURATION}ms ease-out, display ${ANIMATION_DURATION}ms ease-out allow-discrete, overlay ${ANIMATION_DURATION}ms ease-out allow-discrete`,
    },

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
      [breakpoints.md]: "1600px",
    },
    maxHeight: {
      default: "90dvh",
      [breakpoints.md]: "90vh",
    },

    // Transform for animations
    // Mobile: slide up from bottom, Desktop: fade + scale from center
    transform: {
      default: "translateY(100dvh)",
      [breakpoints.md]: "translate(-50%, -50%) scale(0.95)",
      // eslint-disable-next-line @stylexjs/valid-styles
      ":open": {
        default: "translateY(0)",
        [breakpoints.md]: "translate(-50%, -50%) scale(1)",
        "@starting-style": {
          default: "translateY(100dvh)",
          [breakpoints.md]: "translate(-50%, -50%) scale(0.95)",
        },
      },
    },

    // Opacity for desktop fade animation
    opacity: {
      default: 1,
      [breakpoints.md]: 0,
      // eslint-disable-next-line @stylexjs/valid-styles
      ":open": {
        default: 1,
        "@starting-style": {
          default: 1,
          [breakpoints.md]: 0,
        },
      },
    },

    // Border radius: rounded top on mobile, fully rounded on desktop
    borderTopLeftRadius: border.radius_3,
    borderTopRightRadius: border.radius_3,
    borderBottomLeftRadius: {
      default: 0,
      [breakpoints.md]: border.radius_3,
    },
    borderBottomRightRadius: {
      default: 0,
      [breakpoints.md]: border.radius_3,
    },
  },
  closeButton: {
    position: "absolute",
    right: { default: space._2, [breakpoints.md]: space._5 },
    top: { default: space._2, [breakpoints.md]: space._5 },
    zIndex: layer.content,
  },
});
