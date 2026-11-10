"use client";

import { QuestionIcon } from "@phosphor-icons/react/dist/ssr/Question";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { isOpen } from "./to-todo-item-data.ts";
import { TodoBulkBar } from "./todo-bulk-bar.tsx";
import { TodoShortcutHelp } from "./todo-shortcut-help.tsx";
import { idsBetween, todoShortcutOf } from "./todo-shortcut-of.ts";
import { useTodoStore } from "./todo-store-provider.tsx";

interface TodoSelection {
  /** Whether a tap on a row picks it. */
  selecting: boolean;
  isSelected: (id: string) => boolean;
  /** Picks a row or takes it out. `extend` picks all rows from the last one. */
  pick: (id: string, extend: boolean) => void;
  start: () => void;
  stop: () => void;
  openHelp: () => void;
  /** The button that opens the list of keys, where the page shows one. */
  helpButtonRef: RefObject<HTMLButtonElement | null>;
}

const TodoSelectionContext = createContext<TodoSelection | null>(null);

/** The selection and the keys of the list around this row. A list without them, such as a report's, gets null. */
export function useTodoSelection() {
  return use(TodoSelectionContext);
}

function idOfRow(row: HTMLElement) {
  return row.dataset.todoRow ?? "";
}

/**
 * A list of to-dos that keys and a selection can act on. Each row is in the DOM
 * in the order the owner sees, over the groups of the list, so the DOM gives the
 * order of `j` and `k` and of a range, and focus marks the row that the keys
 * act on.
 */
export function TodoSelectionArea({
  canAdd,
  canSearch,
  children,
}: {
  /** Whether the area holds the input for a new to-do. */
  canAdd: boolean;
  /** Whether the page has the search box. */
  canSearch: boolean;
  children: ReactNode;
}) {
  const { rows, setDone, closeMany } = useTodoStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const focusBeforeHelpRef = useRef<HTMLElement | null>(null);
  const chosen = rows.filter((row) => isOpen(row) && picked.has(row.id));
  const selecting = selectMode || chosen.length > 0;

  function rowElements() {
    return [
      ...(rootRef.current?.querySelectorAll<HTMLElement>("[data-todo-row]") ??
        []),
    ];
  }

  function stop() {
    setSelectMode(false);
    setPicked(new Set());
    setAnchor(null);
  }

  function openHelp() {
    const { activeElement } = document;
    focusBeforeHelpRef.current =
      activeElement instanceof HTMLElement && activeElement !== document.body
        ? activeElement
        : null;
    setHelpOpen(true);
  }

  // The sheet gives the focus back only to an element that had the focus.
  // When no element had it, the focus stays in the sheet while the sheet
  // closes, and the keys do not work. Safari does not focus a button on a click.
  function closeHelp() {
    setHelpOpen(false);
    const target = focusBeforeHelpRef.current?.isConnected
      ? focusBeforeHelpRef.current
      : helpButtonRef.current;
    target?.focus({ preventScroll: true });
    const { activeElement } = document;
    if (activeElement !== target && activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  function pick(id: string, extend: boolean) {
    const span =
      extend && anchor !== null
        ? idsBetween(rowElements().map(idOfRow), anchor, id)
        : null;
    setPicked((current) => {
      const next = new Set(current);
      if (span) for (const spanned of span) next.add(spanned);
      else if (!next.delete(id)) next.add(id);
      return next;
    });
    setAnchor(id);
  }

  useEffect(() => {
    function neighbour(row: HTMLElement, by: 1 | -1) {
      const elements = rowElements();
      const index = elements.indexOf(row) + by;
      return index < 0 ? undefined : elements.at(index);
    }

    function isOpenRow(element: HTMLElement) {
      const todo = rows.find((entry) => entry.id === idOfRow(element));
      return todo !== undefined && isOpen(todo);
    }

    /** After a tick, the next open to-do, so that a second `x` does not reopen a done one. */
    function nextOpenRow(row: HTMLElement) {
      const elements = rowElements();
      const index = elements.indexOf(row);
      const isOtherOpen = (element: HTMLElement) =>
        element !== row && isOpenRow(element);
      return (
        elements.slice(index + 1).find(isOtherOpen) ??
        elements.slice(0, index).findLast(isOtherOpen)
      );
    }

    function closeOrReopen(row: HTMLElement) {
      const id = idOfRow(row);
      const todo = rows.find((entry) => entry.id === id);
      if (!todo) return;
      const closing = isOpen(todo);
      (closing
        ? nextOpenRow(row)
        : (neighbour(row, 1) ?? neighbour(row, -1))
      )?.focus();
      setDone(id, closing);
    }

    function moveFocus(from: HTMLElement | null, by: 1 | -1) {
      (from ? neighbour(from, by) : rowElements().at(0))?.focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      const shortcut = todoShortcutOf(event);
      if (!shortcut) return;
      const { target } = event;
      const row =
        target instanceof Element
          ? target.closest<HTMLElement>("[data-todo-row]")
          : null;
      const act = (action: () => void) => {
        event.preventDefault();
        action();
      };
      switch (shortcut) {
        case "next":
          act(() => {
            moveFocus(row, 1);
          });
          return;
        case "previous":
          act(() => {
            moveFocus(row, -1);
          });
          return;
        case "new":
          if (canAdd) {
            act(() => {
              rootRef.current
                ?.querySelector<HTMLInputElement>("[data-todo-quick-add] input")
                ?.focus();
            });
          }
          return;
        case "search":
          if (canSearch) {
            act(() => {
              const box = document.querySelector('[role="search"]');
              const input = box?.querySelector("input");
              if (input) input.select();
              else box?.querySelector("button")?.click();
            });
          }
          return;
        case "help":
          act(openHelp);
          return;
        case "done":
          if (chosen.length > 0) {
            act(() => {
              closeMany(chosen.map((todo) => todo.id));
              stop();
            });
          } else if (row) {
            act(() => {
              closeOrReopen(row);
            });
          }
          return;
        case "select":
          if (row && row === target) {
            const id = idOfRow(row);
            const todo = rows.find((entry) => entry.id === id);
            if (todo && isOpen(todo)) {
              act(() => {
                pick(id, false);
              });
            }
          }
          return;
        case "clear":
          if (selecting) {
            act(stop);
          }
          return;
        case "edit":
          return;
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  return (
    <TodoSelectionContext
      value={{
        selecting,
        isSelected: (id) => picked.has(id),
        pick,
        start: () => {
          setSelectMode(true);
        },
        stop,
        openHelp,
        helpButtonRef,
      }}
    >
      <div ref={rootRef} css={styles.area}>
        {children}
        {selecting ? <TodoBulkBar chosen={chosen} onStop={stop} /> : null}
      </div>
      <TodoShortcutHelp
        isOpen={helpOpen}
        canAdd={canAdd}
        canSearch={canSearch}
        onClose={closeHelp}
      />
    </TodoSelectionContext>
  );
}

/** The way into a selection, for a finger and a mouse, and the way to the list of keys. */
export function TodoListTools() {
  const { rows } = useTodoStore();
  const selection = useTodoSelection();
  const keysLabel = t({ en: "Keyboard shortcuts", zh: "键盘快捷键" });
  if (!selection || !rows.some(isOpen)) return null;
  const { selecting, start, stop, openHelp, helpButtonRef } = selection;
  return (
    <div css={[cluster.tight, styles.tools]}>
      <Button
        ref={helpButtonRef}
        size="sm"
        look="ghost"
        icon={<QuestionIcon weight="bold" />}
        aria-label={keysLabel}
        css={styles.keysButton}
        onClick={openHelp}
      />
      <Button
        size="sm"
        look="ghost"
        bleed="end"
        onClick={selecting ? stop : start}
      >
        {selecting
          ? t({ en: "Cancel", zh: "取消" })
          : t({ en: "Select", zh: "选择" })}
      </Button>
    </div>
  );
}

const styles = stylex.create({
  area: {
    display: "contents",
  },
  tools: {
    flexShrink: 0,
    flexWrap: "nowrap",
    justifyContent: "flex-end",
  },
  keysButton: {
    display: { default: "none", [pointer.canHover]: "inline-flex" },
  },
});
