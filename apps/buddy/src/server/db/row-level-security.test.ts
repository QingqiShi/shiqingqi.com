import { randomUUID } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createBuddyTestKit } from "#src/testing/create-buddy-test-kit.ts";
import { asArchive } from "./as-archive.ts";
import { asViewer } from "./as-viewer.ts";
import { buddyUsageDays, machines } from "./schema.ts";

let kit: Awaited<ReturnType<typeof createBuddyTestKit>>;
let mara: string;
let noor: string;

async function addMac(userId: string, machineId: string) {
  await kit.db
    .insert(machines)
    .values({ machineId, userId, publicKey: machineId, name: machineId });
  await kit.db.insert(buddyUsageDays).values({
    userId,
    machineId,
    day: "2026-11-07",
    tokens: 100,
    costUsd: 1,
  });
}

beforeAll(async () => {
  kit = await createBuddyTestKit();
  mara = await kit.addAccount("mara0001");
  noor = await kit.addAccount("noor0001");
  await addMac(mara, "mac-mara");
  await addMac(noor, "mac-noor");
  await kit.sessionCookie(mara);
  await kit.sessionCookie(noor);
});

afterAll(() => kit.db.close());

type Row = Record<string, unknown>;

function rowsOf(result: unknown): Row[] {
  if (
    typeof result !== "object" ||
    result === null ||
    !("rows" in result) ||
    !Array.isArray(result.rows)
  ) {
    throw new Error("Not a query result");
  }
  return result.rows.filter(
    (row): row is Row => typeof row === "object" && row !== null,
  );
}

function rowsAs(userId: string | null, query: SQL) {
  return asViewer(kit.db, userId, async (tx) =>
    rowsOf(await tx.execute(query)),
  );
}

function archiveRows(query: SQL) {
  return asArchive(kit.db, async (tx) => rowsOf(await tx.execute(query)));
}

/** Drizzle wraps the error of Postgres in its own, as `cause`. */
function refusal(attempt: Promise<unknown>) {
  return expect(
    attempt.catch((error: unknown) => {
      throw error instanceof Error && error.cause instanceof Error
        ? error.cause
        : error;
    }),
  ).rejects;
}

async function ownerRows(query: SQL) {
  return rowsOf(await kit.db.execute(query));
}

describe("as a signed-in user", () => {
  it("shows only the user's own account and Macs, and with no user nothing", async () => {
    const seen = (userId: string | null) =>
      Promise.all([
        rowsAs(userId, sql`select id from accounts`),
        rowsAs(userId, sql`select machine_id from machines`),
      ]);

    expect(await seen(mara)).toEqual([
      [{ id: mara }],
      [{ machine_id: "mac-mara" }],
    ]);
    expect(await seen(null)).toEqual([[], []]);
    expect(await seen(randomUUID())).toEqual([[], []]);
  });

  it("changes only the user's own rows", async () => {
    expect(
      await rowsAs(
        mara,
        sql`update accounts set is_public = false returning id`,
      ),
    ).toEqual([{ id: mara }]);
    expect(
      await rowsAs(
        mara,
        sql`update machines set name = 'renamed' returning machine_id`,
      ),
    ).toEqual([{ machine_id: "mac-mara" }]);
    expect(
      await ownerRows(
        sql`select a.is_public, m.name from accounts a join machines m on m.user_id = a.id where a.id = ${noor}`,
      ),
    ).toEqual([{ is_public: true, name: "mac-noor" }]);

    await refusal(
      rowsAs(
        mara,
        sql`insert into machines (machine_id, user_id, public_key, name) values ('mac-planted', ${noor}, 'key', 'Planted')`,
      ),
    ).toThrow(/row-level security/);
  });

  it("cannot read an email, change a name or a count, delete a Mac, or reach the archive and sign-in", async () => {
    for (const query of [
      sql`select email from accounts`,
      sql`update accounts set name = 'taken001'`,
      sql`update accounts set visitor_fed = 1000`,
      sql`delete from machines`,
      sql`select 1 from buddy_usage_days`,
      sql`select 1 from buddy_usage_models`,
      sql`select 1 from sessions`,
      sql`select 1 from passkeys`,
    ]) {
      await refusal(rowsAs(mara, query)).toThrow(/permission denied/);
    }
  });
});

describe("as the daily archive", () => {
  it("reads every account and Mac", async () => {
    expect(
      await archiveRows(sql`select name from accounts order by name`),
    ).toEqual([{ name: "mara0001" }, { name: "noor0001" }]);
    expect(
      await archiveRows(
        sql`select machine_id from machines order by machine_id`,
      ),
    ).toEqual([{ machine_id: "mac-mara" }, { machine_id: "mac-noor" }]);
  });

  it("writes a day only under the account of its Mac", async () => {
    await archiveRows(
      sql`insert into buddy_usage_days (user_id, machine_id, day, tokens, cost_usd) values (${mara}, 'mac-mara', '2026-11-08', 5, 0)`,
    );
    await refusal(
      archiveRows(
        sql`insert into buddy_usage_days (user_id, machine_id, day, tokens, cost_usd) values (${noor}, 'mac-mara', '2026-11-08', 5, 0)`,
      ),
    ).toThrow(/row-level security/);
    await refusal(
      archiveRows(
        sql`update buddy_usage_days set user_id = ${noor}, machine_id = 'mac-noor' where machine_id = 'mac-mara'`,
      ),
    ).toThrow(/permission denied/);
    await refusal(
      archiveRows(
        sql`insert into buddy_usage_models (user_id, machine_id, day, model, input_tokens, output_tokens, cache_read_tokens, cache_write_5m_tokens, cache_write_1h_tokens, messages) values (${noor}, 'mac-mara', '2026-11-08', 'claude-opus-5-5', 1, 1, 1, 1, 1, 1)`,
      ),
    ).toThrow(/row-level security/);
  });

  it("cannot read an email, change a name or visibility, delete, or reach sign-in", async () => {
    for (const query of [
      sql`select email from accounts`,
      sql`update accounts set is_public = false`,
      sql`update accounts set name = 'taken001'`,
      sql`update machines set revoked_at = now()`,
      sql`delete from buddy_usage_days`,
      sql`delete from buddy_usage_models`,
      sql`select 1 from sessions`,
      sql`select 1 from email_codes`,
    ]) {
      await refusal(archiveRows(query)).toThrow(/permission denied/);
    }
  });
});

// A new table must turn on row-level security, and a new grant to a limited
// role must be added here on purpose.
it("limits every table, and gives each limited role only these privileges", async () => {
  const tables = await ownerRows(
    sql`select c.relname, c.relrowsecurity, c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' order by c.relname`,
  );
  expect(tables.length).toBeGreaterThan(0);
  for (const table of tables) {
    expect(table).toMatchObject({
      relrowsecurity: true,
      relforcerowsecurity: false,
    });
  }

  const privileges = await ownerRows(sql`
    select grantee, table_name, privilege_type,
      string_agg(column_name, ',' order by column_name) as columns
    from information_schema.column_privileges
    where grantee in ('buddy_app', 'buddy_archive')
    group by grantee, table_name, privilege_type
    union all
    select grantee, table_name, privilege_type, '*'
    from information_schema.role_table_grants
    where grantee in ('buddy_app', 'buddy_archive')
    order by 1, 2, 3, 4`);
  expect(
    privileges.map(
      (row) =>
        `${String(row.grantee)} ${String(row.privilege_type)} ${String(row.table_name)}(${String(row.columns)})`,
    ),
  ).toEqual([
    "buddy_app SELECT accounts(id,is_public,name)",
    "buddy_app UPDATE accounts(is_public)",
    "buddy_app INSERT machines(*)",
    "buddy_app INSERT machines(created_at,machine_id,name,public_key,revoked_at,user_id)",
    "buddy_app SELECT machines(*)",
    "buddy_app SELECT machines(created_at,machine_id,name,public_key,revoked_at,user_id)",
    "buddy_app UPDATE machines(name,revoked_at)",
    "buddy_archive SELECT accounts(id,is_public,name,visitor_fed,visitor_patted)",
    "buddy_archive UPDATE accounts(visitor_fed,visitor_patted)",
    "buddy_archive INSERT buddy_usage_days(*)",
    "buddy_archive INSERT buddy_usage_days(archived_at,cache_read,cost_usd,day,machine_id,prompt_tokens,tokens,user_id)",
    "buddy_archive SELECT buddy_usage_days(*)",
    "buddy_archive SELECT buddy_usage_days(archived_at,cache_read,cost_usd,day,machine_id,prompt_tokens,tokens,user_id)",
    "buddy_archive UPDATE buddy_usage_days(archived_at,cache_read,cost_usd,prompt_tokens,tokens)",
    "buddy_archive INSERT buddy_usage_models(*)",
    "buddy_archive INSERT buddy_usage_models(archived_at,cache_read_tokens,cache_write_1h_tokens,cache_write_5m_tokens,day,input_tokens,machine_id,messages,model,output_tokens,rate,user_id)",
    "buddy_archive SELECT buddy_usage_models(*)",
    "buddy_archive SELECT buddy_usage_models(archived_at,cache_read_tokens,cache_write_1h_tokens,cache_write_5m_tokens,day,input_tokens,machine_id,messages,model,output_tokens,rate,user_id)",
    "buddy_archive UPDATE buddy_usage_models(archived_at,cache_read_tokens,cache_write_1h_tokens,cache_write_5m_tokens,input_tokens,messages,output_tokens)",
    "buddy_archive SELECT machines(machine_id,public_key,revoked_at,user_id)",
  ]);
});
