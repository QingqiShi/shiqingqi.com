import { z } from "zod";
import type { FinanceSession } from "../auth/types.ts";
import { householdRepository } from "../db/repositories/household-repository.ts";
import type { FinanceDb } from "../db/types.ts";
import { financeJson } from "../http/finance-json.ts";
import { guardFinanceRequest } from "../http/guard-finance-request.ts";
import { readFinanceBody } from "../http/read-finance-body.ts";
import { runServerWrite } from "../sync/run-server-write.ts";
import { wireFields } from "../sync/wire-fields.ts";
import { isTimeZone } from "./is-time-zone.ts";

interface HouseholdHandlerDependencies {
  isConfigured: () => boolean;
  getDb: () => FinanceDb;
  getSession: (request: Request) => Promise<FinanceSession | null>;
  now: () => Date;
}

const patchSchema = z
  .object({
    name: wireFields.name.optional(),
    timezone: z
      .string()
      .refine(isTimeZone, "Expected an IANA timezone")
      .optional(),
  })
  .strict();

/**
 * `PATCH /api/finance/household`: renames the Household or changes its
 * timezone. The Household row is not a synced table, so the write moves the
 * clock and the next pull brings the row to every device. The base currency
 * stays fixed in v1. Only the owner may change the Household.
 */
export function makeHouseholdHandler(
  dependencies: HouseholdHandlerDependencies,
) {
  return async (request: Request) => {
    const session = await guardFinanceRequest(dependencies, request, {
      write: true,
      owner: true,
    });
    if (session instanceof Response) return session;
    const patch = await readFinanceBody(request, patchSchema);
    if (patch instanceof Response) return patch;
    const { clock } = await runServerWrite(
      dependencies.getDb(),
      session.householdId,
      dependencies.now(),
      async (context) => {
        await householdRepository.update(context.scope, patch);
        context.markWritten();
      },
    );
    return financeJson({ clock });
  };
}
