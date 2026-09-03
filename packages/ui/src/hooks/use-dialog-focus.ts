import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import { getTabbableElements } from "../utils/get-tabbable-elements.ts";

/**
 * Manages focus lifecycle for modal dialogs:
 * - Saves the element that triggered the dialog
 * - Moves focus into the dialog once it renders
 * - Traps Tab/Shift+Tab within the dialog
 * - Closes on Escape
 * - Restores focus to the trigger element on cleanup
 *
 * @param isOpen - Whether the dialog is currently open.
 * @param dialogRef - Ref to the dialog container element (used for focus trapping).
 * @param onClose - Called when the user presses Escape.
 * @param initialFocusRef - Optional ref to the element that should receive focus when
 *   the dialog opens. Falls back to the first tabbable element inside the dialog.
 */
export function useDialogFocus({
  isOpen,
  dialogRef,
  onClose,
  initialFocusRef,
}: {
  isOpen: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const triggerRef = useRef<HTMLElement | null>(null);

  // Read the latest `onClose` / `initialFocusRef` without putting them in
  // the effect dep array. Parent re-renders (e.g. per AI-chat streaming
  // chunk) hand us fresh inline closures and freshly-derived refs; without
  // this indirection the effect tears down and restarts on every render,
  // which silently yanks focus back to the initial target, overwrites
  // `triggerRef` with a dialog-internal element, and re-binds the keydown
  // handler. See cycle 5 brief.
  const handleEscape = useEffectEvent(() => {
    onClose();
  });
  const resolveInitialFocus = useEffectEvent(() => {
    if (initialFocusRef?.current) return initialFocusRef.current;
    if (dialogRef.current) {
      const tabbable = getTabbableElements(dialogRef.current);
      if (tabbable.length > 0) return tabbable[0];
    }
    return null;
  });

  useEffect(() => {
    if (!isOpen) return;

    // Remember the element that had focus before the dialog opened
    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    // Move focus into the dialog once the portal renders
    requestAnimationFrame(() => {
      resolveInitialFocus()?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleEscape();
        return;
      }

      // Trap focus within the dialog
      if (event.key === "Tab" && dialogRef.current) {
        const tabbableElements = getTabbableElements(dialogRef.current);
        if (tabbableElements.length === 0) return;

        const first = tabbableElements[0];
        const last = tabbableElements[tabbableElements.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the element that opened the dialog
      triggerRef.current?.focus();
    };
  }, [isOpen, dialogRef]);
}
