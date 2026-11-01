import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { eq } from "drizzle-orm";
import { mailDigests, type UserLocale } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { withUser } from "#src/assistant/db/with-user.ts";
import type {
  PushMessage,
  PushSender,
} from "#src/assistant/push/get-push-sender.ts";
import { pushDevices } from "#src/assistant/push/push-devices.ts";
import type { BuiltDigest } from "./build-digest.ts";

// The cron writes the notification outside React, where `t()` cannot run,
// so its two languages are here.
const COPY: Record<
  UserLocale,
  {
    title: string;
    act: (count: number) => string;
    calm: string;
  }
> = {
  en: {
    title: "Your morning digest",
    act: (count) =>
      count === 1
        ? "1 thing needs you today."
        : `${String(count)} things need you today.`,
    calm: "Nothing needs you today.",
  },
  zh: {
    title: "今日邮件摘要",
    act: (count) => `今天有 ${String(count)} 件事需要你处理。`,
    calm: "今天没有需要你处理的事。",
  },
};

export function digestMessage(digest: BuiltDigest): PushMessage {
  const copy = COPY[digest.locale];
  return {
    title: copy.title,
    body:
      digest.headline ??
      (digest.counts.act > 0 ? copy.act(digest.counts.act) : copy.calm),
    url: getLocalePath("/", digest.locale),
  };
}

/**
 * Sends the digest to each of the user's devices. A device the push
 * service no longer knows is removed; a failed send is not retried, since
 * the page has the digest anyway.
 */
export async function notifyDigest(
  { db, userId }: { db: AssistantDb; userId: string },
  digest: BuiltDigest,
  { send, now }: { send: PushSender; now: () => Date },
): Promise<{ sent: number; removed: number }> {
  const devices = await withUser(db, userId, pushDevices.list);
  if (devices.length === 0) return { sent: 0, removed: 0 };
  const message = digestMessage(digest);
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
    if (sent.length > 0) {
      await scope.db
        .update(mailDigests)
        .set({ notifiedAt: now() })
        .where(eq(mailDigests.id, digest.id));
    }
  });
  return { sent: sent.length, removed: gone.length };
}
