import { randomUUID } from "node:crypto";
import type { RepositoryScope } from "#src/finance/db/repositories/types.ts";
import { categories, households, members } from "#src/finance/db/schema.ts";
import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "#src/finance/domain/dates/default-household-time-zone.ts";

interface CreateHouseholdMember {
  id?: string;
  name: string;
  role: "owner" | "member";
  userId?: string;
}

interface CreateHouseholdInput {
  name: string;
  baseCurrency?: string;
  timezone?: string;
  members: CreateHouseholdMember[];
}

interface CreatedHousehold {
  /** In the order of `input.members`. */
  memberIds: string[];
  uncategorised: { expense: string; income: string };
}

const INITIAL_CLOCK = 1;

/**
 * Creates the Household of `scope`, its members, and the system
 * "Uncategorised" expense and income categories. Sign-in setup and the
 * importer both use it, inside `withHousehold` of the new Household's id.
 */
export async function createHousehold(
  { db, householdId }: RepositoryScope,
  input: CreateHouseholdInput,
): Promise<CreatedHousehold> {
  const memberRows = input.members.map((member) => ({
    id: member.id ?? randomUUID(),
    householdId,
    userId: member.userId ?? null,
    name: member.name,
    role: member.role,
    version: INITIAL_CLOCK,
  }));
  const uncategorised = { expense: randomUUID(), income: randomUUID() };

  await db.insert(households).values({
    id: householdId,
    name: input.name,
    baseCurrency: input.baseCurrency ?? "GBP",
    timezone: input.timezone ?? DEFAULT_HOUSEHOLD_TIME_ZONE,
    clock: INITIAL_CLOCK,
  });
  if (memberRows.length > 0) {
    await db.insert(members).values(memberRows);
  }
  await db.insert(categories).values(
    (["expense", "income"] as const).map((kind) => ({
      id: uncategorised[kind],
      householdId,
      kind,
      name: "Uncategorised",
      isSystem: true,
      version: INITIAL_CLOCK,
    })),
  );

  return { memberIds: memberRows.map((row) => row.id), uncategorised };
}
