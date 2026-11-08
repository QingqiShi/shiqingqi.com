import { requireAuthSecret } from "../auth/get-auth-secret.ts";
import { getBuddyDb } from "../db/get-buddy-db.ts";
import { makeMachineRegistry } from "../machines/make-machine-registry.ts";
import { nextSnapshot } from "../snapshot/next-snapshot.ts";
import { buddyKeys } from "../store/buddy-keys.ts";
import { getBuddyBackend } from "../store/get-buddy-backend.ts";
import { devAccount } from "./dev-account.ts";
import { devFixtureUploads } from "./dev-fixture-uploads.ts";

const SYNC_ATTEMPTS = 30;

/**
 * Gives the memory store of `pnpm dev` the dev account (public), its Mac `dev-mac`
 * and the fixture snapshots of two Macs. Then, as soon as the dev database
 * answers, it copies the accounts and Macs of the database in, as the daily
 * cron does, so that the ones from earlier dev sessions work again.
 */
export async function seedDevStore(now: number) {
  const { kv, inMemory } = getBuddyBackend();
  if (!inMemory) return;
  const registry = makeMachineRegistry({ kv, secret: requireAuthSecret() });
  const { id: userId, name } = devAccount;
  await registry.setVisibility({ userId, name, isPublic: true });
  await registry.connect({
    machineId: devAccount.machine,
    userId,
    name,
    publicKey: devAccount.publicKey(),
  });
  const uploads = devFixtureUploads(now);
  await kv.addToSet(
    buddyKeys.accountMacs(name),
    uploads.map(({ machine }) => machine),
  );
  for (const { machine, body } of uploads) {
    await kv.set(
      buddyKeys.macSnapshot(machine),
      JSON.stringify(nextSnapshot(null, body, body.at)),
    );
  }

  const db = getBuddyDb();
  if (!db) return;
  void (async () => {
    for (let attempt = 0; attempt < SYNC_ATTEMPTS; attempt++) {
      try {
        await registry.syncFrom(db);
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    console.error(
      "Buddy: the dev database did not answer, so its Macs are not in the memory store.",
    );
  })();
}
