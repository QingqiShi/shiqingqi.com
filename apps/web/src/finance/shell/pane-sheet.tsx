"use client";

import { Sheet } from "@tuja/ui/components/sheet";
import { findTwinElement } from "@tuja/ui/utils/find-twin-element";
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

/**
 * A task in a `Sheet`, such as a new Transaction or an edit of an account,
 * at every width. Drive `isOpen` from the URL where a reload should open it
 * again. When it closes, focus goes back to the element that opened it, also
 * when a list drew that element again: give a row a stable `id` or `href`.
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
      findTwinElement(trigger)?.focus();
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
