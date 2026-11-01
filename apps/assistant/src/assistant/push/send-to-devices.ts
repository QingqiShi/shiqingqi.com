import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser, type UserScope } from "#src/assistant/db/with-user.ts";
import type { PushMessage, PushSender } from "./get-push-sender.ts";
import { pushDevices } from "./push-devices.ts";

/**
 * Sends one message to each of the user's devices. A device the push
 * service no longer knows is removed; a failed send is not retried.
 * `onSent` runs in the same transaction when at least one device got it.
 */
export async function sendToDevices(
  { db, userId }: { db: AssistantDb; userId: string },
  message: PushMessage,
  {
    send,
    now,
    onSent,
  }: {
    send: PushSender;
    now: () => Date;
    onSent?: (scope: UserScope) => Promise<unknown>;
  },
): Promise<{ sent: number; removed: number }> {
  const devices = await withUser(db, userId, pushDevices.list);
  if (devices.length === 0) return { sent: 0, removed: 0 };
  const outcomes = await Promise.all(
    devices.map(async (device) => ({
      endpoint: device.endpoint,
      outcome: await send(device, message),
    })),
  );
  const endpointsOf = (outcome: string) =>
    outcomes.flatMap((entry) =>
      entry.outcome === outcome ? [entry.endpoint] : [],
    );
  const sent = endpointsOf("sent");
  const gone = endpointsOf("gone");
  await withUser(db, userId, async (scope) => {
    await pushDevices.remove(scope, gone);
    await pushDevices.markSent(scope, sent, now());
    if (sent.length > 0) await onSent?.(scope);
  });
  return { sent: sent.length, removed: gone.length };
}
