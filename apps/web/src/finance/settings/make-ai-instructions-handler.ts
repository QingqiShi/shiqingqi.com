import { z } from "zod";
import type { FinanceSession } from "../auth/types.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { financeJson } from "../http/finance-json.ts";
import { guardFinanceRequest } from "../http/guard-finance-request.ts";
import { readFinanceBody } from "../http/read-finance-body.ts";
import { runServerWrite } from "../sync/run-server-write.ts";
import { MAX_AI_INSTRUCTIONS_LENGTH } from "./max-ai-instructions-length.ts";

interface AiInstructionsHandlerDependencies {
  isConfigured: () => boolean;
  getDb: () => FinanceDb;
  getSession: (request: Request) => Promise<FinanceSession | null>;
  now: () => Date;
}

const patchSchema = z
  .object({
    aiInstructions: z.string().max(MAX_AI_INSTRUCTIONS_LENGTH),
  })
  .strict();

/**
 * `PATCH /api/finance/household/ai-instructions`: saves what the Household
 * tells the AI that labels its bank rows. Any Member may change it, as any
 * Member may change the Categories. The write moves the clock, so the next
 * pull brings the Household row to every device.
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
    const { clock } = await runServerWrite(
      dependencies.getDb(),
      session.householdId,
      dependencies.now(),
      async (context) => {
        await householdRepository.update(context.scope, {
          aiInstructions: patch.aiInstructions.trim(),
        });
        context.markWritten();
      },
    );
    return financeJson({ clock });
  };
}
