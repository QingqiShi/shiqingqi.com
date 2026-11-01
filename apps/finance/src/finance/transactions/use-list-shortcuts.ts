import { isShortcutKey } from "../shell/is-shortcut-key.ts";
import { useWindowKeydown } from "../shell/use-window-keydown.ts";

interface ListShortcuts {
  onSearch: () => void;
  /** `j` is +1, `k` is −1. */
  onMove: (step: 1 | -1) => void;
  onOpen: () => void;
  onCategory: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function isControl(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    target.closest("a, button, [role=button], summary") !== null
  );
}

/**
 * The desktop keys of the Transactions screen: `/` search, `j`/`k` move,
 * Enter open, `e` edit, `c` Category, `d` delete, Esc close. None of them
 * fires while the person types in a field or holds a modifier. The shell
 * holds `n`, which opens a new Transaction on every screen.
 */
export function useListShortcuts(shortcuts: ListShortcuts) {
  useWindowKeydown((event) => {
    if (!isShortcutKey(event)) return;
    const actions: Record<string, (() => void) | undefined> = {
      "/": shortcuts.onSearch,
      j: () => {
        shortcuts.onMove(1);
      },
      k: () => {
        shortcuts.onMove(-1);
      },
      e: shortcuts.onOpen,
      c: shortcuts.onCategory,
      d: shortcuts.onDelete,
      Escape: shortcuts.onClose,
      Enter: isControl(event.target) ? undefined : shortcuts.onOpen,
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  });
}
