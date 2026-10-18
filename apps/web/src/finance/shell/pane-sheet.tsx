"use client";

import { Sheet } from "@tuja/ui/components/sheet";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { t } from "#src/i18n.ts";

interface PaneSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Names the sheet for assistive technology. */
  label: string;
  /** Takes focus when the sheet opens, such as the first field of an editor. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

/** Focuses the element that opened the sheet, or the one that took its place when a list drew its rows again. */
function returnFocus(trigger: HTMLElement) {
  if (trigger.isConnected) {
    trigger.focus();
    return;
  }
  const href = trigger.getAttribute("href");
  const twin =
    (trigger.id ? document.getElementById(trigger.id) : null) ??
    (href
      ? [...document.querySelectorAll<HTMLElement>("a[href]")].find(
          (anchor) => anchor.getAttribute("href") === href,
        )
      : undefined);
  twin?.focus();
}

/**
 * A detail pane in a `Sheet`, below `lg`. Drive
 * `isOpen` from the URL (`useUrlSelection`) so back closes it and a reload
 * opens it again; `MasterDetailLayout` does that wiring. When it closes,
 * focus goes back to the row that opened it, also when the list drew that
 * row again: give a row a stable `id` or `href`.
 */
export function PaneSheet({
  isOpen,
  onClose,
  label,
  initialFocusRef,
  children,
}: PaneSheetProps) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (document.activeElement instanceof HTMLElement) {
        triggerRef.current = document.activeElement;
      }
      return;
    }
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (!trigger) return;
    const frame = requestAnimationFrame(() => {
      if (document.activeElement !== document.body) return;
      returnFocus(trigger);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isOpen]);

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t({ en: "Close", zh: "关闭" })}
      aria-label={label}
      initialFocusRef={initialFocusRef}
    >
      {children}
    </Sheet>
  );
}
