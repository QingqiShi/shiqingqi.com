"use client";

import { TodoList } from "./todo-list.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

/** The rows that a search found. The box above them says how many, or that it found none. */
export function TodoSearchResults() {
  const { rows } = useTodoStore();
  return rows.length === 0 ? null : (
    <TodoList ids={rows.map((row) => row.id)} showSource showDoneDate />
  );
}
