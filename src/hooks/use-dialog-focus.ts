import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'iframe:not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => !element.closest("[inert]"));
}

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
 *   the dialog opens. Falls back to the first focusable element inside the dialog.
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

  useEffect(() => {
    if (!isOpen) return;

    // Remember the element that had focus before the dialog opened
    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    // Move focus into the dialog once the portal renders
    requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (dialogRef.current) {
        const focusable = getFocusableElements(dialogRef.current);
        if (focusable.length > 0) focusable[0].focus();
      }
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      // Trap focus within the dialog
      if (event.key === "Tab" && dialogRef.current) {
        const focusableElements = getFocusableElements(dialogRef.current);
        if (focusableElements.length === 0) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

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
  }, [isOpen, onClose, dialogRef, initialFocusRef]);
}
