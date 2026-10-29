import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../testing/seed-test-household.ts";
import { withHousehold } from "../with-household.ts";
import { draftRowRepository } from "./draft-row-repository.ts";

let db: TestDb;
let home: SeededHousehold;
let other: SeededHousehold;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db);
  other = await seedTestHousehold(db, "other");
});

afterEach(async () => {
  await db.close();
});

function selectCategoryIds(
  where: Parameters<typeof draftRowRepository.select<"categories">>[2],
) {
  return withHousehold(db, home.householdId, async (scope) =>
    (await draftRowRepository.select(scope, "categories", where))
      .map((row) => row.id)
      .sort(),
  );
}

const homeCategoryIds = () => [home.groceriesId, home.salaryId].sort();

describe("draftRowRepository.select", () => {
  it("selects nothing for no keys or no matches", async () => {
    expect(await selectCategoryIds({ keys: [] })).toEqual([]);
    expect(await selectCategoryIds({ matches: [] })).toEqual([]);
  });

  it("selects every row of the Household, and no other, for an empty match", async () => {
    expect(await selectCategoryIds({ matches: [{}] })).toEqual(
      homeCategoryIds(),
    );
    expect(
      await selectCategoryIds({ matches: [{ id: other.groceriesId }, {}] }),
    ).toEqual(homeCategoryIds());
  });

  it("scopes an empty match to the Household without row level security", async () => {
    const rows = await withHousehold(db, home.householdId, async (scope) => {
      // The test database owner is not subject to row level security, so only the household filter of the query can exclude the other Household.
      await scope.db.execute(sql`reset role`);
      return draftRowRepository.select(scope, "categories", {
        matches: [{}],
      });
    });
    expect(rows.map((row) => row.id).sort()).toEqual(homeCategoryIds());
  });
});
