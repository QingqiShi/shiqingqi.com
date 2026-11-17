"use client";

import * as stylex from "@stylexjs/stylex";
import { Card } from "@tuja/ui/components/card";
import { Divider } from "@tuja/ui/components/divider";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { ReorderList, useReorderItem } from "@tuja/ui/components/reorder-list";
import { Fragment } from "react";
import { spanOfMove } from "../report/rearrange.ts";
import type { TodoItemData } from "./to-todo-item-data.ts";
import { TodoItem } from "./todo-item.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";
import { useMoveLabels } from "./use-move-labels.ts";

function SortableRow({ id, title }: { id: string; title: string }) {
  const { ref, css, handle, moveUp, moveDown } = useReorderItem(id, title);
  return (
    <TodoItem
      id={id}
      showSource
      sortable={{
        itemRef: ref,
        itemCss: css,
        handle,
        moves: { up: moveUp, down: moveDown },
      }}
    />
  );
}

/** To-dos that can change places among themselves. */
function SortableRun({ todos }: { todos: readonly TodoItemData[] }) {
  const { reorder } = useTodoStore();
  const labels = useMoveLabels();
  const ids = todos.map((todo) => todo.id);
  return (
    <ReorderList
      {...labels}
      ids={ids}
      keyboard={false}
      onMove={(from, to) => {
        reorder(spanOfMove(ids, from, to));
      }}
    >
      <ul css={listSurface.list}>
        {todos.map((todo) => (
          <SortableRow key={todo.id} id={todo.id} title={todo.title} />
        ))}
      </ul>
    </ReorderList>
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
  return (
    <Card padding="none" css={styles.runs}>
      {runs.map((run, index) => (
        <Fragment key={run.key}>
          {index > 0 ? <Divider /> : null}
          <SortableRun todos={run.todos} />
        </Fragment>
      ))}
    </Card>
  );
}

const styles = stylex.create({
  runs: {
    gap: 0,
    overflow: "hidden",
  },
});
