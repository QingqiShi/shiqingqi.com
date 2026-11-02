import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { todos, userSettings } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { insertUser } from "#src/assistant/mail/testing/insert-account.ts";
import type {
  PushMessage,
  PushOutcome,
  PushSender,
} from "#src/assistant/push/get-push-sender.ts";
import { pushDevices } from "#src/assistant/push/push-devices.ts";
import { makeTodoRemindersCron } from "./make-todo-reminders-cron.ts";
import { todoLimits } from "./todo-limits.ts";

const SECRET = "test-secret";
const NOW = new Date("2026-11-02T15:00:00Z");
const PAST = new Date("2026-11-02T14:58:00Z");
const FUTURE = new Date("2026-11-02T15:30:00Z");

let db: TestDb;
let owner: string;
let pushed: { endpoint: string; message: PushMessage }[];
let outcome: PushOutcome;

beforeEach(async () => {
  db = await createTestDb();
  owner = await insertUser(db);
  pushed = [];
  outcome = "sent";
  await addDevice(owner, "https://push.example.com/owner");
});

afterEach(async () => {
  await db.close();
});

function addDevice(userId: string, endpoint: string) {
  return pushDevices.save(
    { db, userId },
    { endpoint, keys: { p256dh: "p", auth: "a" } },
    "test",
  );
}

function runCron(
  now = NOW,
  {
    secret = SECRET,
    getPushSender = () => (device, message) => {
      pushed.push({ endpoint: device.endpoint, message });
      return Promise.resolve(outcome);
    },
  }: {
    secret?: string;
    getPushSender?: () => PushSender | null;
  } = {},
) {
  return makeTodoRemindersCron({
    isConfigured: () => true,
    getDb: () => db,
    getCronSecret: () => SECRET,
    now: () => now,
    getPushSender,
  })(
    new Request("http://localhost/api/cron/todo-reminders", {
      headers: { Authorization: `Bearer ${secret}` },
    }),
  );
}

async function insertTodo(
  values: Partial<typeof todos.$inferInsert> = {},
  userId = owner,
) {
  const [row] = await db
    .insert(todos)
    .values({ userId, title: "Call the bank", remindAt: PAST, ...values })
    .returning();
  return row;
}

async function stored(id: string) {
  const [row] = await db.select().from(todos).where(eq(todos.id, id));
  return row;
}

describe("the to-do reminder cron", () => {
  it("sends a due reminder once, however often it runs", async () => {
    const todo = await insertTodo();

    await Promise.all([runCron(), runCron()]);
    await runCron(new Date(NOW.getTime() + 5 * 60_000));

    expect(pushed).toHaveLength(1);
    expect(pushed[0].message.title).toBe("Call the bank");
    expect((await stored(todo.id)).remindedAt).not.toBeNull();
  });

  it("sends nothing for a to-do that is done, deleted or not due", async () => {
    await insertTodo({ doneAt: PAST });
    await insertTodo({ deletedAt: PAST });
    await insertTodo({ remindAt: FUTURE });
    await insertTodo({ remindAt: null });
    await insertTodo({ remindAt: PAST, snoozedUntil: FUTURE });

    await runCron();

    expect(pushed).toEqual([]);
  });

  it("sends a reminder only to the devices of its owner", async () => {
    const other = await insertUser(db);
    await addDevice(other, "https://push.example.com/other");
    await insertTodo({ title: "Mine" });

    await runCron();

    expect(
      pushed.map(({ endpoint, message }) => [endpoint, message.title]),
    ).toEqual([["https://push.example.com/owner", "Mine"]]);
  });

  it("offers Done and Snooze in the owner's language and opens the to-dos", async () => {
    await db.insert(userSettings).values({ userId: owner, locale: "zh" });
    const todo = await insertTodo();

    await runCron();

    expect(pushed[0].message).toMatchObject({
      url: "/zh/todos",
      tag: `todo-${todo.id}`,
      reminder: { todoId: todo.id, done: "完成", snooze: "1 小时后提醒" },
    });
  });

  it("keeps the longest to-do small enough for a push service", async () => {
    await insertTodo({
      title: "账".repeat(todoLimits.titleChars),
      detail: "单".repeat(todoLimits.detailChars),
    });

    await runCron();

    const { message } = pushed[0];
    expect(Buffer.byteLength(JSON.stringify(message))).toBeLessThan(3500);
  });

  it("tries again next run when no device could take it", async () => {
    await insertTodo();
    outcome = "failed";
    await runCron();
    outcome = "sent";

    await runCron(new Date(NOW.getTime() + 5 * 60_000));
    await runCron(new Date(NOW.getTime() + 10 * 60_000));

    expect(pushed).toHaveLength(2);
  });

  it("does not try again when one device took it and another failed", async () => {
    await addDevice(owner, "https://push.example.com/second");
    await insertTodo();
    let call = 0;
    const getPushSender = () => () => {
      call += 1;
      return Promise.resolve<PushOutcome>(call === 1 ? "failed" : "sent");
    };

    await runCron(NOW, { getPushSender });
    await runCron(NOW, { getPushSender });

    expect(call).toBe(2);
  });

  it("leaves reminders unclaimed when no key can send them", async () => {
    const todo = await insertTodo();

    const response = await runCron(NOW, { getPushSender: () => null });

    expect(response.status).toBe(503);
    expect((await stored(todo.id)).remindedAt).toBeNull();
  });

  it("refuses a request without the cron secret", async () => {
    await insertTodo();

    const response = await runCron(NOW, { secret: "wrong" });

    expect(response.status).toBe(401);
    expect(pushed).toEqual([]);
  });
});
