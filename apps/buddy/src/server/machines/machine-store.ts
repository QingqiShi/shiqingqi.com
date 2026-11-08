import { randomInt } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { machines } from "../db/schema.ts";
import type { BuddyDb } from "../db/types.ts";

const ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function newMachineId() {
  let id = "mac-";
  for (let i = 0; i < 10; i++) id += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
  return id;
}

// A key that is connected already keeps its machine id, so a second approval
// of the same Mac does not add a second machine.
async function connect(
  db: BuddyDb,
  input: { userId: string; publicKey: string; name: string; now: Date },
): Promise<{ machineId: string; name: string }> {
  return db.transaction(async (tx) => {
    const existing = (
      await tx
        .update(machines)
        .set({ name: input.name })
        .where(
          and(
            eq(machines.userId, input.userId),
            eq(machines.publicKey, input.publicKey),
            isNull(machines.revokedAt),
          ),
        )
        .returning({ machineId: machines.machineId, name: machines.name })
    ).at(0);
    if (existing) return existing;
    const [created] = await tx
      .insert(machines)
      .values({
        userId: input.userId,
        machineId: newMachineId(),
        publicKey: input.publicKey,
        name: input.name,
        createdAt: input.now,
      })
      .returning({ machineId: machines.machineId, name: machines.name });
    return created;
  });
}

function list(db: BuddyDb, userId: string) {
  return db
    .select({
      machineId: machines.machineId,
      name: machines.name,
      createdAt: machines.createdAt,
    })
    .from(machines)
    .where(and(eq(machines.userId, userId), isNull(machines.revokedAt)))
    .orderBy(asc(machines.createdAt), asc(machines.machineId));
}

// True also for a machine that was removed before, so that a retry
// after a failed Redis write succeeds.
async function revoke(
  db: BuddyDb,
  input: { userId: string; machineId: string; now: Date },
): Promise<boolean> {
  const own = and(
    eq(machines.userId, input.userId),
    eq(machines.machineId, input.machineId),
  );
  await db
    .update(machines)
    .set({ revokedAt: input.now })
    .where(and(own, isNull(machines.revokedAt)));
  return (await db.$count(machines, own)) > 0;
}

/** Write the change to Redis after each one, with the machine registry. */
export const machineStore = { connect, list, revoke };
