import { useEffect, useEffectEvent } from "react";

interface ListShortcuts {
  onNew: () => void;
  onSearch: () => void;
  /** `j` is +1, `k` is −1. */
  onMove: (step: 1 | -1) => void;
  onOpen: () => void;
  onEdit: () => void;
  onCategory: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** True when a key press belongs to what has focus: a field, or a control that Enter or Space activates. */
function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.closest("input, textarea, select, [role=combobox]") !== null;
}

function isControl(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    target.closest("a, button, [role=button], summary") !== null
  );
}

/**
 * The desktop keys of the Transactions screen: `n` new, `/` search, `j`/`k`
 * move, Enter open, `e` edit, `c` Category, `d` delete, Esc close. None of
 * them fires while the person types in a field or holds a modifier.
 */
export function useListShortcuts(shortcuts: ListShortcuts) {
  const handle = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (isTyping(event.target)) return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("[role=dialog]")
    ) {
      return;
    }
    const actions: Record<string, (() => void) | undefined> = {
      n: shortcuts.onNew,
      "/": shortcuts.onSearch,
      j: () => {
        shortcuts.onMove(1);
      },
      k: () => {
        shortcuts.onMove(-1);
      },
      e: shortcuts.onEdit,
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

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      handle(event);
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, []);
}
