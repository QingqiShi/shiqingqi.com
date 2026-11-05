"use client";

import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { border } from "@tuja/ui/tokens.stylex";
import { spanOfMove } from "../report/rearrange.ts";
import {
  SortableRows,
  useMoveStatus,
  useSortableRow,
} from "./sortable-rows.tsx";
import type { TodoItemData } from "./to-todo-item-data.ts";
import { TodoItem } from "./todo-item.tsx";
import type { TodoMoves } from "./todo-row-menu.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

function SortableRow({
  id,
  draggable,
  moves,
}: {
  id: string;
  draggable: boolean;
  moves: TodoMoves;
}) {
  const row = useSortableRow(id, draggable);
  return <TodoItem id={id} showSource sortable={{ ...row, moves }} />;
}

/** To-dos that can change places among themselves. */
function SortableRun({
  todos,
  onMoved,
}: {
  todos: readonly TodoItemData[];
  onMoved: (title: string, place: number, count: number) => void;
}) {
  const { reorder } = useTodoStore();
  const ids = todos.map((todo) => todo.id);
  const move = (from: number, to: number) => {
    reorder(spanOfMove(ids, from, to));
    onMoved(todos[from].title, to + 1, ids.length);
  };
  return (
    <SortableRows ids={ids} onMove={move}>
      <ul css={[listSurface.list, styles.run]}>
        {ids.map((id, index) => (
          <SortableRow
            key={id}
            id={id}
            draggable={ids.length > 1}
            moves={{
              up:
                index > 0
                  ? () => {
                      move(index, index - 1);
                    }
                  : null,
              down:
                index < ids.length - 1
                  ? () => {
                      move(index, index + 1);
                    }
                  : null,
            }}
          />
        ))}
      </ul>
    </SortableRows>
  );
}

/**
 * One card of to-dos that the owner can put in order, each run on its own: drag
 * a row by its handle, or use Move up and Move down in its menu.
 */
export function SortableTodoList({
  runs,
}: {
  runs: readonly { key: string; todos: readonly TodoItemData[] }[];
}) {
  const [status, noteMoved] = useMoveStatus();
  return (
    <div css={[cardSurface.base, listSurface.list]}>
      {runs.map((run) => (
        <SortableRun key={run.key} todos={run.todos} onMoved={noteMoved} />
      ))}
      <div role="status" css={a11y.srOnly}>
        {status}
      </div>
    </div>
  );
}

const styles = stylex.create({
  run: {
    borderBlockStartWidth: { default: border.size_1, ":first-child": 0 },
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
});
