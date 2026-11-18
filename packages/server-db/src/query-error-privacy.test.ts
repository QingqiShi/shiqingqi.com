import { inspect } from "node:util";
import { PGlite } from "@electric-sql/pglite";
import { DrizzleQueryError, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleOnPglite } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runTransaction } from "./run-transaction.ts";
import { poolOn } from "./testing/watch-pool.ts";

const MARKER = "made-up-private-trip-note";
const NAME_MARKER = "made_up_private_trip_note";

let pglite: PGlite;
let served: Awaited<ReturnType<typeof poolOn>>;
let onPool: ReturnType<typeof drizzle>;
let onPglite: ReturnType<typeof drizzleOnPglite>;

beforeAll(async () => {
  pglite = await PGlite.create();
  await pglite.exec(`
    create table notes (
      key text primary key,
      size integer not null constraint notes_size_positive check (size > 0)
    );
    insert into notes values ('${MARKER}', 1);
  `);
  served = await poolOn(pglite);
  onPool = drizzle({ client: served.pool });
  onPglite = drizzleOnPglite({ client: pglite });
});

afterAll(async () => {
  await served.close();
  await pglite.close();
});

async function failure(run: Promise<unknown>): Promise<unknown> {
  try {
    await run;
  } catch (error: unknown) {
    return error;
  }
  throw new Error("The query did not fail");
}

function expectNoMarker(error: unknown) {
  expect(error).toBeInstanceOf(DrizzleQueryError);
  if (!(error instanceof Error)) return;
  const printed = [
    error.message,
    error.stack ?? "",
    String(error),
    inspect(error, { depth: Infinity }),
    inspect(error, { depth: Infinity, showHidden: true }),
    JSON.stringify(error),
  ];
  for (const text of printed) {
    expect(text).not.toContain(MARKER);
    expect(text).not.toContain(NAME_MARKER);
  }
}

const failures: { name: string; query: SQL; code: string }[] = [
  {
    name: "a unique violation, whose detail holds the key",
    query: sql`insert into notes values (${MARKER}, 2)`,
    code: "23505",
  },
  {
    name: "a check violation, whose detail holds the whole row",
    query: sql`insert into notes values (${`${MARKER}-2`}, -1)`,
    code: "23514",
  },
  {
    name: "a bad value, whose message holds the value",
    query: sql`select ${MARKER}::uuid`,
    code: "22P02",
  },
  {
    name: "a missing relation, whose message holds the name it looked for",
    query: sql`select ${NAME_MARKER}::regclass`,
    code: "42P01",
  },
];

describe.each([
  { driver: "a pg Pool", db: () => onPool },
  { driver: "PGlite", db: () => onPglite },
])("on $driver", ({ db }) => {
  it.each(failures)(
    "the error of $name keeps its code and not the values",
    async ({ query, code }) => {
      const error = await failure(db().execute(query));
      expectNoMarker(error);
      expect(error).toMatchObject({ cause: { code, severity: "ERROR" } });
    },
  );

  it("keeps the constraint and the table that a caller can branch on", async () => {
    const error = await failure(
      db().execute(sql`insert into notes values (${MARKER}, 2)`),
    );
    expect(error).toMatchObject({
      cause: { code: "23505", constraint: "notes_pkey", table: "notes" },
    });
  });
});

it("keeps the values out of the error of a query in a transaction on a pg Pool", async () => {
  const error = await failure(
    runTransaction(onPool, (tx) =>
      tx.execute(sql`insert into notes values (${MARKER}, 2)`),
    ),
  );
  expectNoMarker(error);
  expect(error).toMatchObject({ cause: { code: "23505" } });
});
