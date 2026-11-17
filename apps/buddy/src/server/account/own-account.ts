import { eq } from "drizzle-orm";
import { asViewer } from "../db/as-viewer.ts";
import { accounts } from "../db/schema.ts";
import type { BuddyDb } from "../db/types.ts";

/** The signed-in user's own account. Row-level security shows no other. */
export async function ownAccount(db: BuddyDb, userId: string) {
  const rows = await asViewer(db, userId, (tx) =>
    tx
      .select({ name: accounts.name, isPublic: accounts.isPublic })
      .from(accounts)
      .where(eq(accounts.id, userId))
      .limit(1),
  );
  return rows.at(0) ?? null;
}

export async function ownAccountName(db: BuddyDb, userId: string) {
  return (await ownAccount(db, userId))?.name ?? null;
}

/**
 * Makes the user's page public or private. `whileLocked` runs while the
 * account row is locked. Null when the user has no account.
 */
export function setOwnVisibility(
  db: BuddyDb,
  input: {
    userId: string;
    isPublic: boolean;
    whileLocked: (account: {
      name: string;
      isPublic: boolean;
    }) => Promise<void>;
  },
): Promise<{ name: string; isPublic: boolean } | null> {
  const { userId, isPublic } = input;
  return asViewer(db, userId, async (tx) => {
    const locked = (
      await tx
        .select({ name: accounts.name })
        .from(accounts)
        .where(eq(accounts.id, userId))
        .for("update")
    ).at(0);
    if (!locked) return null;
    await tx.update(accounts).set({ isPublic }).where(eq(accounts.id, userId));
    const account = { name: locked.name, isPublic };
    await input.whileLocked(account);
    return account;
  });
}
