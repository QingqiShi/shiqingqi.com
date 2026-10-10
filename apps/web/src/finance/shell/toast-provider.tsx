"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { animate } from "@tuja/ui/primitives/motion.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, layer, rhythm, shadow, space } from "@tuja/ui/tokens.stylex";
import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePortalTarget } from "#src/site-shell/portal-context.tsx";
import { tabBarTokens } from "./tab-bar.stylex.ts";

const DEFAULT_DURATION_MS = 10_000;

export interface ToastOptions {
  /** Labels come from `t()` in render; an event handler passes them in. */
  message: string;
  action?: { label: string; onAction: () => void };
  /** How long it stays. Defaults to 10 s, the window for Undo. */
  durationMs?: number;
}

interface ShownToast extends ToastOptions {
  id: number;
}

const ToastContext = createContext<((toast: ToastOptions) => void) | null>(
  null,
);

/** Shows one toast at a time; a new one replaces the one on screen. */
export function useToast() {
  const show = use(ToastContext);
  if (!show) throw new Error("useToast must be used within a ToastProvider");
  return show;
}

/**
 * The Finance toast: one message at a time at the bottom of the screen, with
 * an optional action such as Undo. It is announced politely, slides in
 * (a fade under reduced motion), and stays while the pointer or focus is on
 * it.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ShownToast | null>(null);
  const [held, setHeld] = useState(false);
  const nextIdRef = useRef(0);
  const portalTarget = usePortalTarget();

  useEffect(() => {
    if (!toast || held) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, toast.durationMs ?? DEFAULT_DURATION_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [toast, held]);

  const show = (options: ToastOptions) => {
    nextIdRef.current++;
    setHeld(false);
    setToast({ ...options, id: nextIdRef.current });
  };

  const region = (
    <div css={styles.anchor}>
      <div
        css={styles.positioner}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast ? (
          <div
            key={toast.id}
            css={[
              corner.radius_3,
              styles.toast,
              animate.fadeIn,
              animate.slideUp,
            ]}
            onPointerEnter={() => {
              setHeld(true);
            }}
            onPointerLeave={() => {
              setHeld(false);
            }}
            onFocus={() => {
              setHeld(true);
            }}
            onBlur={() => {
              setHeld(false);
            }}
          >
            <span css={[typeRole.bodySmall, styles.message]}>
              {toast.message}
            </span>
            {toast.action ? (
              <Button
                size="sm"
                look="ghost"
                bright
                onClick={() => {
                  toast.action?.onAction();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <ToastContext value={show}>
      {children}
      {portalTarget ? createPortal(region, portalTarget) : null}
    </ToastContext>
  );
}

const styles = stylex.create({
  // A 0 x 0 box at the bottom centre. A full-width fixed bar would be what
  // iOS Safari samples for the status bar colour. The portal target is a
  // 0 x 0 box at the viewport origin, so the box states its own place in the
  // viewport.
  anchor: {
    position: "absolute",
    insetBlockStart: {
      default: `calc(100dvh - ${tabBarTokens.clearance} - ${space._10} - ${space._3})`,
      [breakpoints.md]: `calc(100dvh - ${space._10} - ${space._3} - env(safe-area-inset-bottom))`,
      [breakpoints.lg]: `calc(100dvh - ${space._5} - env(safe-area-inset-bottom))`,
    },
    insetInlineStart: "50vw",
    inlineSize: 0,
    blockSize: 0,
    zIndex: layer.toaster,
  },
  positioner: {
    position: "absolute",
    insetBlockEnd: 0,
    insetInlineStart: 0,
    transform: "translateX(-50%)",
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.item,
    inlineSize: "max-content",
    maxInlineSize: `calc(100vw - ${space._7})`,
    paddingBlock: space._1,
    paddingInlineStart: space._3,
    paddingInlineEnd: space._1,
    color: color.fgOnInverse,
    backgroundColor: color.bgInverse,
    boxShadow: shadow._3,
    pointerEvents: "auto",
  },
  message: {
    paddingBlock: space._1,
  },
});
