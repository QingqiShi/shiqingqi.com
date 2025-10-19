"use client";

import * as stylex from "@stylexjs/stylex";
import { useDeferredValue, ViewTransition } from "react";
import { createPortal } from "react-dom";
import { RemoveScroll } from "react-remove-scroll";
import { usePortalTarget } from "@/contexts/portal-context";
import { color, font, layer, space } from "@/tokens.stylex";
import { Button } from "./button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel,
  cancelLabel,
}: ConfirmDialogProps) {
  const portalTarget = usePortalTarget();
  const deferredIsOpen = useDeferredValue(isOpen);

  if (!deferredIsOpen || !portalTarget) {
    return null;
  }

  return createPortal(
    <>
      <ViewTransition>
        <div css={styles.backdrop} onClick={onCancel} />
      </ViewTransition>
      <ViewTransition enter="fade-in" exit="fade-out">
        <RemoveScroll enabled={deferredIsOpen} allowPinchZoom forwardProps>
          <div css={styles.dialog}>
            <h2 css={styles.title}>{title}</h2>
            <p css={styles.message}>{message}</p>
            <div css={styles.actions}>
              <Button onClick={onCancel} type="button">
                {cancelLabel}
              </Button>
              <Button
                onClick={onConfirm}
                type="button"
                css={styles.confirmButton}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </RemoveScroll>
      </ViewTransition>
    </>,
    portalTarget,
  );
}

const styles = stylex.create({
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: layer.tooltip,
    pointerEvents: "all",
  },

  dialog: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: color.backgroundRaised,
    borderRadius: "12px",
    padding: space._5,
    zIndex: layer.tooltip,
    maxWidth: "400px",
    width: "90%",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
    pointerEvents: "all",
  },

  title: {
    fontSize: font.size_4,
    fontWeight: font.weight_6,
    color: color.textMain,
    margin: 0,
    marginBottom: space._3,
  },

  message: {
    fontSize: font.size_2,
    color: color.textMuted,
    margin: 0,
    marginBottom: space._5,
    lineHeight: 1.5,
  },

  actions: {
    display: "flex",
    gap: space._2,
    justifyContent: "flex-end",
  },

  confirmButton: {
    backgroundColor: {
      default: color.controlActive,
      ":hover": color.controlActiveHover,
    },
    color: color.textOnActive,
  },
});
