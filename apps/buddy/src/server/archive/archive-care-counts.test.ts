import { eq } from "drizzle-orm";
import { expect, it } from "vitest";
import { createBuddyTestKit } from "#src/testing/create-buddy-test-kit.ts";
import { accounts } from "../db/schema.ts";
import { buddyKeys } from "../store/buddy-keys.ts";
import { archiveCareCounts } from "./archive-care-counts.ts";

it("keeps the larger visitor count in Postgres, and restores a lost one in Redis", async () => {
  const kit = await createBuddyTestKit();
  try {
    const id = await kit.addAccount("qingqi");
    await kit.kv.incrementBy([
      [buddyKeys.careFed("qingqi"), 5],
      [buddyKeys.carePatted("qingqi"), 2],
    ]);
    await archiveCareCounts(kit.kv, kit.db);
    await kit.kv.delMany([buddyKeys.careFed("qingqi")]);
    await kit.kv.incrementBy([[buddyKeys.carePatted("qingqi"), 1]]);
    await archiveCareCounts(kit.kv, kit.db);

    const [row] = await kit.db
      .select({ fed: accounts.visitorFed, patted: accounts.visitorPatted })
      .from(accounts)
      .where(eq(accounts.id, id));
    expect(row).toEqual({ fed: 5, patted: 3 });
    expect(
      await kit.kv.getMany([
        buddyKeys.careFed("qingqi"),
        buddyKeys.carePatted("qingqi"),
      ]),
    ).toEqual(["5", "3"]);
  } finally {
    await kit.db.close();
  }
});
