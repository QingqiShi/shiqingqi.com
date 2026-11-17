import { Callout } from "@tuja/ui/components/callout";
import { useState } from "react";
import type { DraftOp } from "#src/trips/ops/apply-ops.ts";
import { useEditor } from "./editor-provider.tsx";

/**
 * How a form of the sheet makes its change: the sheet closes when the trip
 * takes the change, and else the form shows the words that say why not.
 */
export function useFormChange(onDone: (rowId?: string) => void) {
  const editor = useEditor();
  const [problem, setProblem] = useState<string | null>(null);
  return {
    submit(
      ops: readonly DraftOp[],
      options: { message: string; dayId?: string },
      rowId?: string,
    ) {
      const result = editor.change(ops, options);
      if (result.ok) onDone(rowId);
      else setProblem(result.message);
    },
    setProblem,
    problem: problem ? (
      <Callout intent="destructive" role="alert">
        {problem}
      </Callout>
    ) : null,
  };
}
