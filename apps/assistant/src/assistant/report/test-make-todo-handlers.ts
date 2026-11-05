import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach } from "vitest";
import { todos } from "#src/assistant/db/schema.ts";
import {
  createTestDb,
  type TestDb,
} from "#src/assistant/db/testing/create-test-db.ts";
import { insertUser } from "#src/assistant/mail/testing/insert-account.ts";
import { makeTodoHandlers } from "./make-todo-handlers.ts";

const ORIGIN = "http://localhost:3000";
export const NOW = new Date("2026-11-02T09:00:00Z");

export let db: TestDb;
export let owner: string;
export let stranger: string;
export let handlers: ReturnType<typeof makeTodoHandlers>;

export function setUpTodoHandlers() {
  beforeEach(async () => {
    db = await createTestDb();
    owner = await insertUser(db);
    stranger = await insertUser(db);
    handlers = makeTodoHandlers({
      isConfigured: () => true,
      getDb: () => db,
      getCalendarDeps: () => null,
      getSession: () =>
        Promise.resolve({ sessionId: randomUUID(), userId: owner }),
      now: () => NOW,
    });
  });

  afterEach(async () => {
    await db.close();
  });
}

export function request(method: string, body?: unknown) {
  return new Request(`${ORIGIN}/api/todos`, {
    method,
    headers: { Origin: ORIGIN, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function insertTodo(userId: string, title = "Pay") {
  const [row] = await db.insert(todos).values({ userId, title }).returning();
  return row;
}

export async function stored(id: string) {
  const [row] = await db.select().from(todos).where(eq(todos.id, id));
  return row;
}
