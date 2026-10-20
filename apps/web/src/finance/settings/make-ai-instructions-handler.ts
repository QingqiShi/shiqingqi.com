import { z } from "zod";
import { applyInstructionChange } from "../ai/apply-instruction-change.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { financeJson } from "../http/finance-json.ts";
import {
  guardFinanceRequest,
  type FinanceRequestGuardDependencies,
} from "../http/guard-finance-request.ts";
import { readFinanceBody } from "../http/read-finance-body.ts";
import { runServerWrite } from "../sync/run-server-write.ts";
import {
  MAX_AI_INSTRUCTIONS_LENGTH,
  MAX_INSTRUCTION_LINE_LENGTH,
} from "./max-ai-instructions-length.ts";

interface AiInstructionsHandlerDependencies extends FinanceRequestGuardDependencies {
  getDb: () => FinanceDb;
  now: () => Date;
}

const patchSchema = z.union([
  z
    .object({
      aiInstructions: z.string().max(MAX_AI_INSTRUCTIONS_LENGTH),
    })
    .strict(),
  z
    .object({
      change: z
        .object({
          replaces: z.string().max(MAX_AI_INSTRUCTIONS_LENGTH).nullable(),
          line: z.string().trim().min(1).max(MAX_INSTRUCTION_LINE_LENGTH),
        })
        .strict(),
    })
    .strict(),
]);

/**
 * `PATCH /api/finance/household/ai-instructions`: saves what the Household
 * tells the AI that labels its bank rows. Any Member may change it, as any
 * Member may change the Categories. The body holds the whole text, or one
 * line to add or change ("Teach the AI"), which is made on the text as it is
 * now. The write moves the clock, so the next pull brings the Household row
 * to every device.
 */
export function makeAiInstructionsHandler(
  dependencies: AiInstructionsHandlerDependencies,
) {
  return async (request: Request) => {
    const session = await guardFinanceRequest(dependencies, request, {
      write: true,
    });
    if (session instanceof Response) return session;
    const patch = await readFinanceBody(request, patchSchema);
    if (patch instanceof Response) return patch;
    const { clock, result } = await runServerWrite(
      dependencies.getDb(),
      session.householdId,
      dependencies.now(),
      async (context) => {
        let aiInstructions: string;
        if ("change" in patch) {
          const household = await householdRepository.find(context.scope);
          aiInstructions = applyInstructionChange(
            household?.aiInstructions ?? "",
            patch.change,
          );
          if (aiInstructions.length > MAX_AI_INSTRUCTIONS_LENGTH) {
            return "too-long";
          }
        } else {
          aiInstructions = patch.aiInstructions.trim();
        }
        await householdRepository.update(context.scope, { aiInstructions });
        context.markWritten();
        return "saved";
      },
    );
    if (result === "too-long") {
      return financeJson({ error: "too-long" }, { status: 400 });
    }
    return financeJson({ clock });
  };
}
