import { useEffect, useEffectEvent, useRef, type RefObject } from "react";
import { getTabbableElements } from "../focus/get-tabbable-elements.ts";

/**
 * Manages focus lifecycle for modal dialogs:
 * - Saves the element that triggered the dialog
 * - Moves focus into the dialog once it renders
 * - Traps Tab/Shift+Tab within the dialog, also where the browser's Tab skips
 *   the first or the last element of the dialog, as Safari's does
 * - Closes on Escape
 * - Restores focus to the trigger element on cleanup
 *
 * @param isOpen - Whether the dialog is currently open.
 * @param dialogRef - Ref to the dialog container element (used for focus trapping).
 * @param onClose - Called when the user presses Escape.
 * @param initialFocusRef - Optional ref to the element that should receive focus when
 *   the dialog opens. Falls back to the first tabbable element inside the dialog.
 * @param returnFocusRef - Optional ref to the element that gets focus on cleanup
 *   when no element had focus before the dialog opened. A press on a button does
 *   not give it focus in Safari.
 */
export function useDialogFocus({
  isOpen,
  dialogRef,
  onClose,
  initialFocusRef,
  returnFocusRef,
}: {
  isOpen: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
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
    const returnFocusTarget = returnFocusRef?.current;

    // Move focus into the dialog once the portal renders. A dialog can start
    // out of view, such as a sheet that slides in from below the screen, and
    // a focus that scrolls would then move the page.
    requestAnimationFrame(() => {
      resolveInitialFocus()?.focus({ preventScroll: true });
    });

    let tabOut: "forward" | "backward" | null = null;

    function handleKeyDown(event: KeyboardEvent) {
      tabOut = null;
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
        const { activeElement } = document;
        if (
          activeElement === document.body ||
          dialogRef.current.contains(activeElement)
        ) {
          tabOut = event.shiftKey ? "backward" : "forward";
        }

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    // Safari's Tab skips links, and buttons too with its default setting. So a
    // Tab can leave from an element that is not the last one that the keydown
    // sees, and only the focus that lands outside tells.
    function handleFocusIn({ target }: FocusEvent) {
      const dialog = dialogRef.current;
      if (tabOut === null || dialog === null) return;
      if (target instanceof Node && dialog.contains(target)) return;
      const tabbableElements = getTabbableElements(dialog);
      const wrapTo = tabOut === "forward" ? 0 : tabbableElements.length - 1;
      tabbableElements[wrapTo]?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      // Restore focus to the element that opened the dialog. The dialog can
      // still move back into that element, such as a sheet that shrinks into
      // the row that opened it, so the page must not scroll to it.
      const trigger = triggerRef.current;
      const target = trigger === document.body ? returnFocusTarget : trigger;
      target?.focus({ preventScroll: true });
    };
  }, [isOpen, dialogRef, returnFocusRef]);
}
