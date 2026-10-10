import { randomUUID } from "node:crypto";
import { categories, households, members } from "#src/finance/db/schema.ts";
import type { FinanceDb } from "#src/finance/db/types.ts";
import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "#src/finance/domain/dates/default-household-time-zone.ts";

interface CreateHouseholdMember {
  id?: string;
  name: string;
  role: "owner" | "member";
  userId?: string;
}

interface CreateHouseholdInput {
  id?: string;
  name: string;
  baseCurrency?: string;
  timezone?: string;
  members: CreateHouseholdMember[];
}

interface CreatedHousehold {
  householdId: string;
  /** In the order of `input.members`. */
  memberIds: string[];
  uncategorised: { expense: string; income: string };
}

const INITIAL_CLOCK = 1;

/**
 * Creates a household, its members, and the system "Uncategorised" expense
 * and income categories. Sign-in setup and the importer both use it.
 */
export async function createHousehold(
  db: FinanceDb,
  input: CreateHouseholdInput,
): Promise<CreatedHousehold> {
  const householdId = input.id ?? randomUUID();
  const memberRows = input.members.map((member) => ({
    id: member.id ?? randomUUID(),
    householdId,
    userId: member.userId ?? null,
    name: member.name,
    role: member.role,
    version: INITIAL_CLOCK,
  }));
  const uncategorised = { expense: randomUUID(), income: randomUUID() };

  await db.transaction(async (tx) => {
    await tx.insert(households).values({
      id: householdId,
      name: input.name,
      baseCurrency: input.baseCurrency ?? "GBP",
      timezone: input.timezone ?? DEFAULT_HOUSEHOLD_TIME_ZONE,
      clock: INITIAL_CLOCK,
    });
    if (memberRows.length > 0) {
      await tx.insert(members).values(memberRows);
    }
    await tx.insert(categories).values(
      (["expense", "income"] as const).map((kind) => ({
        id: uncategorised[kind],
        householdId,
        kind,
        name: "Uncategorised",
        isSystem: true,
        version: INITIAL_CLOCK,
      })),
    );
  });

  return {
    householdId,
    memberIds: memberRows.map((row) => row.id),
    uncategorised,
  };
}
