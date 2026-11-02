import { List } from "@tuja/ui/components/list";
import { TodoItem } from "./todo-item.tsx";

export function TodoList({
  ids,
  showSource = false,
  showDoneDate = false,
}: {
  ids: readonly string[];
  /** Say on each row that the morning report added it. */
  showSource?: boolean;
  /** Say on each done row which day it was done. */
  showDoneDate?: boolean;
}) {
  return (
    <List>
      {ids.map((id) => (
        <TodoItem
          key={id}
          id={id}
          showSource={showSource}
          showDoneDate={showDoneDate}
        />
      ))}
    </List>
  );
}
