"use client";

import { createContext, type ReactNode } from "react";

/** True where a `TodoItem` shows its state and cannot change it. */
export const TodosReadOnlyContext = createContext(false);

/** Makes every to-do inside read-only, for to-dos that may not exist yet. */
export function TodosReadOnly({ children }: { children: ReactNode }) {
  return <TodosReadOnlyContext value>{children}</TodosReadOnlyContext>;
}
