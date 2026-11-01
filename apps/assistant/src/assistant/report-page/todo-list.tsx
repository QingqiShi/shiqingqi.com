import * as stylex from "@stylexjs/stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border, color } from "@tuja/ui/tokens.stylex";
import type { TodoView } from "../report/read-report.ts";
import { TodoItem } from "./todo-item.tsx";

export function TodoList({
  todos,
  today,
  locale,
}: {
  todos: readonly TodoView[];
  today: string;
  locale: string;
}) {
  return (
    <ul css={[stack.rows, styles.list]}>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={{
            id: todo.id,
            title: todo.title,
            detail: todo.detail,
            dueDate: todo.dueDate,
            done: todo.doneAt !== null,
            openHref: todo.openHref,
          }}
          today={today}
          locale={locale}
        />
      ))}
    </ul>
  );
}

const styles = stylex.create({
  list: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
});
