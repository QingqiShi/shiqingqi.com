"use client";

import { createContext, type ReactNode } from "react";

/**
 * True where a `TodoItem` shows its state and cannot change it: in a preview,
 * which shows a to-do that it would close as the report would show it.
 */
export const TodosReadOnlyContext = createContext(false);

/** Makes every to-do inside read-only, for the to-dos of a preview. */
export function TodosReadOnly({ children }: { children: ReactNode }) {
  return <TodosReadOnlyContext value>{children}</TodosReadOnlyContext>;
}
