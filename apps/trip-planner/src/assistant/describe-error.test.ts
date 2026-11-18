import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, expect, it } from "vitest";
import { describeError } from "./describe-error.ts";

const client = new PGlite();
afterAll(() => client.close());

it("describes a failed query without its parameters", async () => {
  const marker = "secret-trip-note-7f3a";
  const error: unknown = await drizzle({ client })
    .execute(sql`select ${marker}::integer`)
    .then(
      () => null,
      (rejected: unknown) => rejected,
    );

  expect(String(error)).toContain(marker);
  const described = describeError(error);
  expect(described).not.toContain(marker);
  expect(described).toContain("22P02");
});
