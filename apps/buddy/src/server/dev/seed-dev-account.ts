import { accounts, machines } from "../db/schema.ts";
import type { BuddyDb } from "../db/types.ts";
import { devAccount } from "./dev-account.ts";

/**
 * Adds the account that `buddy:session` signs in as, with the machine
 * `dev-mac` that `buddy:dev-upload` signs for, when the database has no
 * account. Its page is public, as the memory store's seed has it. Only the
 * local dev database gets it. Returns true when it seeded.
 */
export async function seedDevAccount(db: BuddyDb): Promise<boolean> {
  if ((await db.$count(accounts)) > 0) return false;
  await db.transaction(async (tx) => {
    await tx.insert(accounts).values({
      id: devAccount.id,
      name: devAccount.name,
      email: devAccount.email,
      isPublic: true,
    });
    await tx.insert(machines).values({
      userId: devAccount.id,
      machineId: devAccount.machine,
      publicKey: devAccount.publicKey(),
      name: "Dev Mac",
    });
  });
  return true;
}
