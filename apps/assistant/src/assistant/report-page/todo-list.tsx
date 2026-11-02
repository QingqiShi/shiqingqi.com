import * as stylex from "@stylexjs/stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border, color } from "@tuja/ui/tokens.stylex";
import type { TodoView } from "../report/read-report.ts";
import { TodoItem, type TodoItemData } from "./todo-item.tsx";

/** What a row shows of a to-do; `openHref` stands in when the to-do names no mail. */
export function toTodoItemData(
  todo: TodoView,
  openHref: string | null = null,
): TodoItemData {
  return {
    id: todo.id,
    title: todo.title,
    detail: todo.detail,
    dueDate: todo.dueDate,
    done: todo.doneAt !== null,
    openHref: todo.openHref ?? openHref,
  };
}

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
          todo={toTodoItemData(todo)}
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
