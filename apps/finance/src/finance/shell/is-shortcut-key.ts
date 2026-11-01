import { isTyping } from "@tuja/ui/utils/is-typing";

function isInDialog(target: EventTarget | null) {
  return (
    target instanceof HTMLElement && target.closest("[role=dialog]") !== null
  );
}

/**
 * True when `event` can be a one-key shortcut of the screen: nothing took
 * it, no modifier is held, and it is not typed in a field or in a dialog.
 */
export function isShortcutKey(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  return !isTyping(event.target) && !isInDialog(event.target);
}
