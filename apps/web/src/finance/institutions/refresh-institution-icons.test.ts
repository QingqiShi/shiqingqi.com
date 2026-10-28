import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import type { InstitutionHints } from "../ai/guess-institution-domain.ts";
import { accounts, institutionIcons } from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import { pullChanges } from "../sync/pull-changes.ts";
import { refreshInstitutionIcons } from "./refresh-institution-icons.ts";

const HOUR_MS = 60 * 60 * 1000;
const START = new Date("2026-10-14T09:00:00Z");

let db: TestDb;
let home: SeededHousehold;
let now: Date;
let guesses: { name: string; hints: InstitutionHints }[];
let fetches: string[];
let answers: Map<string, string | null>;
let sites: Map<string, Uint8Array>;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db, "home");
  now = START;
  guesses = [];
  fetches = [];
  answers = new Map([
    ["Barclay", "barclays.co.uk"],
    ["Barclays ISA", "barclays.co.uk"],
    ["Wise", "wise.com"],
    ["SIPP", null],
  ]);
  sites = new Map([
    ["barclays.co.uk", icon(1)],
    ["wise.com", icon(2)],
    ["monzo.com", icon(3)],
  ]);
});

afterEach(async () => {
  await db.close();
});

function icon(seed: number) {
  return new Uint8Array([seed, 1, 2, 3]);
}

function refresh(
  householdId = home.householdId,
  options: {
    model?: boolean;
    guessDomain?: (name: string) => Promise<string | null>;
    callTimeoutMs?: number;
    endsAt?: number;
  } = {},
) {
  return refreshInstitutionIcons(db, householdId, {
    callTimeoutMs: options.callTimeoutMs ?? 50,
    endsAt: options.endsAt,
    guessDomain:
      options.model === false
        ? undefined
        : (name, hints) => {
            if (options.guessDomain) return options.guessDomain(name);
            guesses.push({ name, hints });
            const withHints = `${name} ${hints.baseCurrency}/${hints.accountCurrency}`;
            const answer = answers.has(withHints)
              ? answers.get(withHints)
              : answers.get(name);
            if (answer === undefined) {
              return Promise.reject(new Error("No answer"));
            }
            return Promise.resolve(answer);
          },
    fetchIcon: (domain) => {
      fetches.push(domain);
      return Promise.resolve(sites.get(domain) ?? null);
    },
    now: () => now,
  });
}

async function setInstitution(
  seeded: SeededHousehold,
  accountId: string,
  fields: {
    institution?: string;
    institutionDomain?: string | null;
    currency?: string;
  },
) {
  const result = await applyMutations(
    db,
    seeded.householdId,
    {
      clientId: randomUUID(),
      mutations: [
        {
          id: randomUUID(),
          name: "upsertAccount",
          args: { id: accountId, ...fields },
        },
      ],
    },
    now,
  );
  expect(result.rejected).toEqual([]);
}

async function accountRow(id: string) {
  const rows = await db.select().from(accounts).where(eq(accounts.id, id));
  const [row] = rows;
  return {
    institutionDomain: row.institutionDomain,
    guessedInstitutionDomain: row.guessedInstitutionDomain,
  };
}

async function iconVersion(domain: string) {
  const rows = await db
    .select({ version: institutionIcons.version })
    .from(institutionIcons)
    .where(eq(institutionIcons.domain, domain));
  return rows.at(0)?.version ?? null;
}

describe("refreshInstitutionIcons", () => {
  it("guesses each name once, fetches each domain once, and writes both to the accounts so a pull sees them", async () => {
    await setInstitution(home, home.currentId, { institution: "Barclay" });
    await setInstitution(home, home.savingsId, { institution: " barclay " });
    await setInstitution(home, home.cardId, { institution: "SIPP" });
    const before = await pullChanges(db, home.householdId, 0);

    const result = await refresh();

    expect(guesses).toEqual([
      {
        name: "Barclay",
        hints: { baseCurrency: "GBP", accountCurrency: "GBP" },
      },
      { name: "SIPP", hints: { baseCurrency: "GBP", accountCurrency: "GBP" } },
    ]);
    expect(fetches).toEqual(["barclays.co.uk"]);
    expect(result).toEqual({ guessed: 2, fetched: 1, failed: 0, updated: 2 });
    const version = await iconVersion("barclays.co.uk");
    expect(version).toMatch(/^[0-9a-f]{16}$/);
    expect(await accountRow(home.currentId)).toEqual({
      institutionDomain: null,
      guessedInstitutionDomain: "barclays.co.uk",
    });
    expect(await accountRow(home.savingsId)).toMatchObject({
      guessedInstitutionDomain: "barclays.co.uk",
    });
    expect(await accountRow(home.cardId)).toEqual({
      institutionDomain: null,
      guessedInstitutionDomain: null,
    });

    const pulled = await pullChanges(db, home.householdId, before.clock);
    expect(pulled.clock).toBe(before.clock + 1);
    expect(
      (pulled.tables.accounts ?? [])
        .map((row) => z.object({ id: z.string() }).parse(row).id)
        .sort(),
    ).toEqual([home.currentId, home.savingsId].sort());
  });

  it("keeps a Member's domain when the institution is renamed", async () => {
    await setInstitution(home, home.currentId, {
      institution: "Barclay",
      institutionDomain: "monzo.com",
    });
    await refresh();

    await setInstitution(home, home.currentId, { institution: "Wise" });

    expect(await accountRow(home.currentId)).toEqual({
      institutionDomain: "monzo.com",
      guessedInstitutionDomain: null,
    });
  });

  it("asks the model again only when the backoff after a failure is over", async () => {
    await setInstitution(home, home.currentId, { institution: "Nationwide" });

    expect(await refresh()).toMatchObject({ guessed: 0, failed: 1 });
    now = new Date(START.getTime() + HOUR_MS / 2);
    await refresh();
    expect(guesses).toHaveLength(1);

    answers.set("Nationwide", "nationwide.co.uk");
    sites.set("nationwide.co.uk", icon(4));
    now = new Date(START.getTime() + HOUR_MS);
    await refresh();

    expect(guesses).toHaveLength(2);
    expect(await accountRow(home.currentId)).toMatchObject({
      guessedInstitutionDomain: "nationwide.co.uk",
    });
    expect(await iconVersion("nationwide.co.uk")).not.toBeNull();
  });
});
