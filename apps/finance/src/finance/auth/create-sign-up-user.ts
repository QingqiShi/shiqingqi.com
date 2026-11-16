import { randomUUID } from "node:crypto";
import { authBodies } from "@tuja/server-auth/auth-bodies";
import { z } from "zod";
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

/** What the sign-up form sends beside the link's token and the passkey. */
export const signUpFields = z.object({
  memberName: z.string().trim().min(1).max(100),
  baseCurrency: z.string().refine(isSupportedCurrency),
  /** The browser's time zone. The household takes the default zone when it is not one Node knows. */
  timezone: z.string().max(100).optional(),
  locale: authBodies.locale,
});

/**
 * Makes the user of a sign-up, with `email` as its verified Recovery email,
 * and a Household that the user owns.
 */
export async function createSignUpUser(
  tx: FinanceAppDb,
  {
    userId,
    email,
    now,
    fields,
  }: {
    userId: string;
    email: string;
    now: Date;
    fields: z.infer<typeof signUpFields>;
  },
) {
  await tx.insert(users).values({
    id: userId,
    displayName: fields.memberName,
    email,
    emailVerifiedAt: now,
  });
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
