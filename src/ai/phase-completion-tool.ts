import "server-only";
import { zodResponsesFunction } from "openai/helpers/zod";
import { z } from "zod";

const phaseCompletionSchema = z.object({
  summary: z.string().describe("Brief summary of data gathered in Phase 1"),
});

export const phaseCompletionTool = zodResponsesFunction({
  name: "complete_phase_1",
  description:
    "Signal completion of Phase 1 data gathering and proceed to Phase 2 filtering/ranking",
  parameters: phaseCompletionSchema,
});

export function executePhaseCompletionToolCall(toolCall: {
  name: string;
  arguments: string;
  call_id: string;
}) {
  const args = JSON.parse(toolCall.arguments) as z.infer<
    typeof phaseCompletionSchema
  >;

  return {
    success: true,
    result: {
      phase: "Phase 1 Complete",
      summary: args.summary,
      next: "Proceeding to Phase 2",
    },
  };
}
