import { archiveUsageDays } from "#src/server/archive/archive-usage-days.ts";
import { isCronAuthorised } from "#src/server/cron/is-cron-authorised.ts";
import { getBuddyDb } from "#src/server/db/get-buddy-db.ts";
import { getMachineRegistry } from "#src/server/machines/get-machine-registry.ts";
import { getBuddyBackend } from "#src/server/store/get-buddy-backend.ts";

export const maxDuration = 300;

/**
 * Vercel Cron, once a day: copies every Mac's days from Redis into Postgres,
 * then writes the accounts and Mac keys of Postgres into Redis again.
 */
export async function GET(request: Request) {
  if (!isCronAuthorised(request, process.env.CRON_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getBuddyDb();
  if (!db) {
    return Response.json({ error: "database not configured" }, { status: 503 });
  }
  const rows = await archiveUsageDays(getBuddyBackend().kv, db);
  await getMachineRegistry().syncFrom(db);
  return Response.json({ ok: true, rows });
}
