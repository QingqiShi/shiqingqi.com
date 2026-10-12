"use client";

import * as stylex from "@stylexjs/stylex";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { breakpoints } from "../breakpoints.stylex.ts";
import { animate } from "../primitives/motion.stylex.ts";
import { Portal } from "../surfaces/portal.tsx";
import { layer, space } from "../tokens.stylex.ts";
import type { StyleProp } from "../types.ts";
import { toastTokens } from "./toast.stylex.ts";
import { Toast, type ToastAction } from "./toast.tsx";

const DEFAULT_DURATION_MS = 10_000;

/** What `useToast` shows. */
export interface ToastOptions {
  /**
   * What happened, in a short sentence. Resolve copy in render and pass it
   * in from the event handler.
   */
  message: ReactNode;
  /** One action that follows from the message, such as Undo. */
  action?: ToastAction;
  /** A second action after `action`, such as "Teach the AI" after Undo. */
  secondAction?: ToastAction;
  /**
   * How long the toast stays, in milliseconds, while the pointer and the
   * focus are elsewhere. Defaults to 10 s, which leaves time for Undo.
   */
  durationMs?: number;
}

interface ShownToast extends ToastOptions {
  id: number;
  leaving: boolean;
}

const ToastContext = createContext<((toast: ToastOptions) => void) | null>(
  null,
);

/**
 * Shows a toast through the nearest `ToastProvider`. One toast shows at a
 * time: a new one takes the place of the one on screen.
 */
export function useToast() {
  const show = use(ToastContext);
  if (!show) throw new Error("useToast must be used within a ToastProvider");
  return show;
}

interface ToastProviderProps {
  /**
   * The part of the app that can show a toast with `useToast`.
   *
   * @zh 可以通过 `useToast` 显示提示的应用部分。
   */
  children: ReactNode;
  /**
   * Accessible name for each toast's close button — the package ships no
   * i18n.
   *
   * @zh 每条提示中关闭按钮的无障碍名称——本包不内置 i18n。
   */
  dismissLabel: string;
  /**
   * Where the toasts portal to. Omit for `document.body`; pass `null` to
   * defer until the target is ready. A target must be a 0 x 0 box fixed at
   * the viewport origin, such as `viewportAnchor.fixed`.
   *
   * @zh 提示渲染到哪里。省略则为 `document.body`；传入 null 可延迟到目标可用为止。目标必须是固定在视口原点的 0 x 0 盒子，例如 `viewportAnchor.fixed`。
   */
  portalTarget?: Element | DocumentFragment | null;
  /**
   * StyleX styles for the box the toasts sit in, composed last. Set
   * `toastTokens.clearance` here to keep the toasts above a bottom bar.
   *
   * @zh 提示所在盒子的 StyleX 样式，最后合成。在此设置 `toastTokens.clearance`，可让提示避开底部栏。
   */
  css?: StyleProp;
}

/**
 * Shows the toasts of `useToast`: one at a time, centred at the bottom of
 * the screen, announced politely. A toast stays while the pointer or the
 * focus is on it, and otherwise goes after its duration; it fades as it
 * goes. Its actions and its close button take it away as well.
 */
export function ToastProvider({
  children,
  dismissLabel,
  portalTarget,
  css,
}: ToastProviderProps) {
  const [toast, setToast] = useState<ShownToast | null>(null);
  const [held, setHeld] = useState(false);
  const nextIdRef = useRef(0);

  const leave = useCallback(() => {
    setToast((shown) => (shown ? { ...shown, leaving: true } : null));
  }, []);

  useEffect(() => {
    if (!toast || toast.leaving || held) return;
    const timer = setTimeout(leave, toast.durationMs ?? DEFAULT_DURATION_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [toast, held, leave]);

  const show = useCallback((options: ToastOptions) => {
    nextIdRef.current++;
    setHeld(false);
    setToast({ ...options, id: nextIdRef.current, leaving: false });
  }, []);

  const region = (
    <div css={[styles.anchor, css]}>
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
              styles.slot,
              toast.leaving && animate.fadeOut,
              toast.leaving && styles.leaving,
            ]}
            onAnimationEnd={(event) => {
              if (toast.leaving && event.target === event.currentTarget) {
                setToast(null);
              }
            }}
          >
            <Toast
              message={toast.message}
              action={leaveAfter(toast.action, leave)}
              secondAction={leaveAfter(toast.secondAction, leave)}
              onDismiss={leave}
              dismissLabel={dismissLabel}
              onPointerEnter={() => {
                setHeld(true);
              }}
              onPointerLeave={() => {
                setHeld(false);
              }}
              onFocus={() => {
                setHeld(true);
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setHeld(false);
                }
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <ToastContext value={show}>
      {children}
      <Portal target={portalTarget} anchored>
        {region}
      </Portal>
    </ToastContext>
  );
}

function leaveAfter(
  action: ToastAction | undefined,
  leave: () => void,
): ToastAction | undefined {
  if (!action) return undefined;
  return {
    label: action.label,
    onAction: () => {
      action.onAction();
      leave();
    },
  };
}

const styles = stylex.create({
  // A 0 x 0 box at the bottom centre: a fixed bar across the bottom would be
  // a box that iOS Safari can sample for the colour of its status bar. The
  // portal target is a 0 x 0 box at the viewport origin, so this box states
  // its own place in the viewport.
  anchor: {
    position: "absolute",
    insetBlockStart: {
      default: `calc(100dvh - ${toastTokens.clearance} - ${space._4})`,
      [breakpoints.md]: `calc(100dvh - ${toastTokens.clearance} - ${space._7})`,
    },
    // Physical, so the centre is the same in either direction.
    left: "50vw",
    inlineSize: 0,
    blockSize: 0,
    zIndex: layer.toaster,
  },
  positioner: {
    position: "absolute",
    insetBlockEnd: 0,
    left: 0,
    transform: "translateX(-50%)",
  },
  slot: {
    pointerEvents: "auto",
  },
  leaving: {
    pointerEvents: "none",
    animationFillMode: "forwards",
  },
});
