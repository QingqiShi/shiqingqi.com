/**
 * Returns true when the given EventTarget is a focusable form field or
 * contenteditable region — i.e. somewhere the user is typing and where the
 * editor's global keyboard shortcuts (Ctrl+Z, Backspace, Delete, Enter,
 * Escape) would clobber the native input behaviour.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLElement) {
    // `isContentEditable` is the canonical browser API but jsdom (used in
    // unit tests) doesn't implement it, so fall back to closest() so that
    // nested children of a contenteditable host are also covered.
    if (target.isContentEditable) return true;
    if (target.closest('[contenteditable=""], [contenteditable="true"]')) {
      return true;
    }
  }
  return false;
}
