import { List } from "@tuja/ui/components/list";
import { TodoItem } from "./todo-item.tsx";

export function TodoList({
  ids,
  showSource = false,
}: {
  ids: readonly string[];
  /** Say on each row that the morning report added it. */
  showSource?: boolean;
}) {
  return (
    <List>
      {ids.map((id) => (
        <TodoItem key={id} id={id} showSource={showSource} />
      ))}
    </List>
  );
}
