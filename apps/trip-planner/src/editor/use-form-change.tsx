import { Callout } from "@tuja/ui/components/callout";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import { useState } from "react";
import type { DraftOp } from "#src/trips/ops/apply-ops.ts";
import { useEditor } from "./editor-provider.tsx";

/**
 * How a form of the sheet makes its change: the sheet closes when the trip
 * takes the change, and else the form shows the words that say why not.
 * `submit` tells whether the trip took the change. `rowId` is the thing
 * that the change makes or changes: the sheet goes back into its row, and
 * the reader opens with it in view. With `keepOpen`, the sheet stays open
 * after the change.
 */
export function useFormChange(onDone: (rowId?: string) => void) {
  const editor = useEditor();
  const [problem, setProblem] = useState<string | null>(null);
  return {
    submit(
      ops: readonly DraftOp[],
      options: { message: string; dayId?: string },
      rowId?: string,
      keepOpen = false,
    ) {
      const result = editor.change(ops, { ...options, thingId: rowId });
      if (!result.ok) setProblem(result.message);
      else if (!keepOpen) onDone(rowId);
      return result.ok;
    },
    setProblem,
    problem: problem ? (
      <FlowBlock>
        <Callout intent="destructive" role="alert">
          {problem}
        </Callout>
      </FlowBlock>
    ) : null,
  };
}
