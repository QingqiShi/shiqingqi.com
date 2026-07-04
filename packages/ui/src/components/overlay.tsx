"use client";

import * as stylex from "@stylexjs/stylex";
import {
  useDeferredValue,
  useRef,
  ViewTransition,
  type PropsWithChildren,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { RemoveScroll } from "react-remove-scroll";
import { breakpoints } from "../breakpoints.stylex.ts";
import { useDialogFocus } from "../hooks/use-dialog-focus.ts";
import { border, color, layer, space } from "../tokens.stylex.ts";
import { Button } from "./button.tsx";

interface OverlayBaseProps {
  /** Whether the overlay is shown. */
  isOpen: boolean;
  /**
   * Called when the user requests dismissal — Escape, a backdrop click, or
   * the close button. The consumer owns the open state.
   */
  onClose: () => void;
  /**
   * Accessible label for the close button. Required — the package ships no
   * i18n, so the consumer supplies the localized string (config layer).
   */
  closeLabel: string;
  /** Icon rendered inside the close button. Defaults to the built-in X icon. */
  closeIcon?: ReactNode;
  /**
   * Where to render the portal. Defaults to `document.body`. Pass an explicit
   * target (e.g. an app-managed portal root) to scope the overlay; pass `null`
   * to defer rendering until a target is available.
   */
  portalTarget?: Element | DocumentFragment | null;
  /**
   * Element to focus when the overlay opens. Falls back to the first
   * focusable element inside the dialog (the close button).
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * A modal dialog must have an accessible name (WCAG 4.1.2), so exactly one of
 * `aria-label` / `aria-labelledby` is required at the type level.
 */
type OverlayLabelProps =
  | {
      /** Accessible name for the dialog. */
      "aria-label": string;
      "aria-labelledby"?: undefined;
    }
  | {
      "aria-label"?: undefined;
      /** Id of a visible element that names the dialog. */
      "aria-labelledby": string;
    };

type OverlayProps = OverlayBaseProps & OverlayLabelProps;

/**
 * Inline X glyph matching the Phosphor "X" icon's metrics (256 viewBox,
 * 16-unit round-capped strokes, 1em box) so the default close affordance
 * renders identically without the icon dependency. Decorative — the close
 * button carries the accessible name via `closeLabel`.
 */
function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 256 256"
      fill="none"
    >
      <path
        d="M56 56 200 200M200 56 56 200"
        stroke="currentColor"
        strokeWidth={16}
        strokeLinecap="round"
      />
    </svg>
  );
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
  initialFocusRef,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: PropsWithChildren<OverlayProps>) {
  const deferredIsOpen = useDeferredValue(isOpen);
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogFocus({
    isOpen: deferredIsOpen,
    dialogRef,
    onClose,
    initialFocusRef,
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
        {/* `forwardProps` makes RemoveScroll clone its single child and inject
            its own ref, which would clobber a `ref` placed directly on the
            dialog div and leave `dialogRef` null (breaking default focus and
            the Tab focus-trap, both of which query `dialogRef.current`). Pass
            the ref through RemoveScroll instead — it forwards onto the child. */}
        <RemoveScroll
          ref={dialogRef}
          enabled={deferredIsOpen}
          allowPinchZoom
          forwardProps
        >
          <div
            css={styles.content}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
          >
            <Button
              css={styles.closeButton}
              icon={closeIcon ?? <CloseIcon />}
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
    inset: 0,
  },
  backdrop: {
    position: "absolute",
    inset: 0,
    backgroundColor: color.bgScrim,
    zIndex: layer.tooltip,
    pointerEvents: "all",
  },
  closeButton: {
    position: "absolute",
    insetInlineEnd: { default: space._2, [breakpoints.md]: space._5 },
    insetBlockStart: { default: space._2, [breakpoints.md]: space._5 },
  },
  content: {
    position: "absolute",
    insetBlockStart: space._8,
    insetInlineStart: 0,
    width: "calc(100% - var(--removed-body-scroll-bar-size, 0px))",
    height: `calc(100% - ${space._8})`,
    backgroundColor: color.bgSurface,
    zIndex: layer.tooltip,
    borderRadius: border.radius_4,
    overflow: "hidden",
    pointerEvents: "all",
  },
});
