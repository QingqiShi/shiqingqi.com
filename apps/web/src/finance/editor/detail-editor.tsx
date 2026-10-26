"use client";

import { useSplitViewColumn } from "@tuja/ui/components/navigation-split-view";
import type { ReactNode } from "react";
import { DrawnAfterRest } from "../shell/drawn-after-rest.tsx";
import { TransactionEditorSkeleton } from "./transaction-editor-skeleton.tsx";

/**
 * A Transaction editor in the detail of a split view. In a sheet, the
 * editor's skeleton shows first, and the editor draws after it, in a
 * deferred pass of its own, and fades in. The editor takes the most time to
 * draw, so the sheet then starts to lift out of its row at once.
 */
export function DetailEditor({ children }: { children: ReactNode }) {
  const column = useSplitViewColumn();
  return (
    <DrawnAfterRest
      isImmediate={column?.presentation !== "sheet"}
      skeleton={<TransactionEditorSkeleton />}
    >
      {children}
    </DrawnAfterRest>
  );
}
