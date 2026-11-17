import type { UserScope } from "#src/assistant/db/types.ts";
import type { PushMessage, PushSender } from "./get-push-sender.ts";
import { pushDevices } from "./push-devices.ts";

/**
 * Sends one message to each of the user's devices. A device the push
 * service no longer knows is removed; a failed send is not retried.
 * `onSent` runs in the same transaction when at least one device got it.
 */
export async function sendToDevices(
  scope: UserScope,
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
  const devices = await pushDevices.list(scope);
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
  await scope.db.transaction(async (tx) => {
    const inTransaction = { ...scope, db: tx };
    await pushDevices.remove(inTransaction, gone);
    await pushDevices.markSent(inTransaction, sent, now());
    if (sent.length > 0) await onSent?.(inTransaction);
  });
  return { sent: sent.length, removed: gone.length };
}
