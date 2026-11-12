type TodoShortcut =
  | "new"
  | "next"
  | "previous"
  | "edit"
  | "done"
  | "search"
  | "help"
  | "select"
  | "clear";

const SHORTCUT_OF_KEY = new Map<string, TodoShortcut>([
  ["n", "new"],
  ["j", "next"],
  ["k", "previous"],
  ["e", "edit"],
  ["x", "done"],
  ["/", "search"],
  ["?", "help"],
  [" ", "select"],
  ["Escape", "clear"],
]);

const ACTS_WHEN_HELD = new Set<TodoShortcut>(["next", "previous"]);

/**
 * Where a key belongs to what has focus. A text field also covers the keydown
 * that Safari sends after a composition ends, which has `isComposing` false.
 */
const OWNS_ITS_KEYS =
  'input:not([type="checkbox"], [type="radio"]), textarea, select, [contenteditable], [role="dialog"], [data-todo-editor]';

/** The shortcut of a key press, or null when the key must do what it does anyway. */
export function todoShortcutOf(event: KeyboardEvent): TodoShortcut | null {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }
  if (event.target instanceof Element && event.target.closest(OWNS_ITS_KEYS)) {
    return null;
  }
  const shortcut = SHORTCUT_OF_KEY.get(event.key) ?? null;
  return event.repeat && shortcut && !ACTS_WHEN_HELD.has(shortcut)
    ? null
    : shortcut;
}

/** The ids from one id to the other, both included, in either direction. Only `to` when `from` is gone. */
export function idsBetween(ids: readonly string[], from: string, to: string) {
  const start = ids.indexOf(from);
  const end = ids.indexOf(to);
  if (start === -1) return [to];
  return ids.slice(Math.min(start, end), Math.max(start, end) + 1);
}
