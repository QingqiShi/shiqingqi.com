import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { setStatementTimeout } from "./set-statement-timeout.ts";
import { createTestDb, type TestDb } from "./testing/create-test-db.ts";
import type { FinanceDb } from "./types.ts";

const showSchema = z.object({
  rows: z.array(z.object({ statement_timeout: z.string() })),
});

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
}, 60_000);

afterEach(async () => {
  await db.close();
});

async function statementTimeout(runner: Pick<FinanceDb, "execute">) {
  const result: unknown = await runner.execute(sql`show statement_timeout`);
  return showSchema.parse(result).rows[0]?.statement_timeout;
}

describe("setStatementTimeout", () => {
  it("bounds statements of the open transaction only", async () => {
    const inside = await db.transaction(async (tx) => {
      await setStatementTimeout(tx);
      return statementTimeout(tx);
    });

    expect(inside).toBe("1min");
    expect(await statementTimeout(db)).toBe("0");
  });
});
