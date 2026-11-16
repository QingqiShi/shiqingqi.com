import { randomUUID } from "node:crypto";
import { authBodies } from "@tuja/server-auth/auth-bodies";
import { HttpError } from "@tuja/server-auth/http-error";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { lookups } from "#src/finance/db/lookups.ts";
import { users } from "#src/finance/db/schema.ts";
import {
  withHousehold,
  type FinanceAppDb,
} from "#src/finance/db/with-household.ts";
import { isSupportedCurrency } from "../exchange-rates/supported-currencies.ts";
import { createHousehold } from "./create-household.ts";
import { defaultAccountGroups } from "./default-account-groups.ts";

function isTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** What the first-run screen sends. */
export const setUpFields = z.object({
  memberName: z.string().trim().min(1).max(100),
  baseCurrency: z.string().refine(isSupportedCurrency),
  /** The browser's time zone. The household takes the default zone when it is not one Node knows. */
  timezone: z.string().max(100).optional(),
  locale: authBodies.locale,
});

/**
 * Makes the first Household of a user who is a Member of none, with the
 * user as its Owner. Refuses a user who is a Member already.
 */
export async function setUpHousehold(
  tx: FinanceAppDb,
  { userId, fields }: { userId: string; fields: z.infer<typeof setUpFields> },
) {
  // The lock makes a second request of the same user wait, and then refuse.
  await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .for("update");
  if ((await lookups.membershipsOfUser(tx, userId)).length > 0) {
    throw new HttpError(409, "already_set_up");
  }
  await tx
    .update(users)
    .set({ displayName: fields.memberName })
    .where(eq(users.id, userId));
  const householdId = randomUUID();
  const memberId = randomUUID();
  await withHousehold(tx, householdId, (scope) =>
    createHousehold(scope, {
      name: fields.memberName,
      baseCurrency: fields.baseCurrency,
      timezone:
        fields.timezone !== undefined && isTimeZone(fields.timezone)
          ? fields.timezone
          : undefined,
      members: [
        { id: memberId, name: fields.memberName, role: "owner", userId },
      ],
      groups: defaultAccountGroups(fields.locale),
    }),
  );
  return { householdId, memberId };
}
