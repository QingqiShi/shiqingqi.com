import { and, eq, inArray } from "drizzle-orm";
import { pushSubscriptions } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/types.ts";

/** What a browser's `PushSubscription.toJSON()` gives, and what a push needs. */
export interface DevicePushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Saves a device. Subscribing a device again replaces its keys. */
async function save(
  { db, userId }: UserScope,
  subscription: DevicePushSubscription,
  userAgent: string,
) {
  const values = {
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent,
  };
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint: subscription.endpoint, ...values })
    .onConflictDoUpdate({
      target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
      set: values,
    });
}

function ownEndpoints(userId: string, endpoints: readonly string[]) {
  return and(
    eq(pushSubscriptions.userId, userId),
    inArray(pushSubscriptions.endpoint, [...endpoints]),
  );
}

async function remove({ db, userId }: UserScope, endpoints: readonly string[]) {
  if (endpoints.length === 0) return;
  await db.delete(pushSubscriptions).where(ownEndpoints(userId, endpoints));
}

async function list({
  db,
  userId,
}: UserScope): Promise<DevicePushSubscription[]> {
  const rows = await db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  return rows.map((row) => ({
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  }));
}

async function markSent(
  { db, userId }: UserScope,
  endpoints: readonly string[],
  now: Date,
) {
  if (endpoints.length === 0) return;
  await db
    .update(pushSubscriptions)
    .set({ lastSentAt: now })
    .where(ownEndpoints(userId, endpoints));
}

/** The devices of a user that get the morning report notification. */
export const pushDevices = { save, remove, list, markSent };
