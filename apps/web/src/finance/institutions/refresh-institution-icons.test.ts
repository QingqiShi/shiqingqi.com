import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import type { InstitutionHints } from "../ai/guess-institution-domain.ts";
import {
  accounts,
  households,
  institutionDomainGuesses,
  institutionIcons,
} from "../db/schema.ts";
import { createTestDb, type TestDb } from "../db/testing/create-test-db.ts";
import {
  seedTestHousehold,
  type SeededHousehold,
} from "../db/testing/seed-test-household.ts";
import { applyMutations } from "../sync/apply-mutations.ts";
import { pullChanges } from "../sync/pull-changes.ts";
import { refreshInstitutionIcons } from "./refresh-institution-icons.ts";

/** The first test database of a file runs the migrations, which is slow on a busy machine. */
const DB_HOOK_TIMEOUT = 60_000;
const HOUR_MS = 60 * 60 * 1000;
const START = new Date("2026-10-14T09:00:00Z");

let db: TestDb;
let home: SeededHousehold;
let other: SeededHousehold;
let now: Date;
let guesses: { name: string; hints: InstitutionHints }[];
let fetches: string[];
let answers: Map<string, string | null>;
let sites: Map<string, Uint8Array>;

beforeEach(async () => {
  db = await createTestDb();
  home = await seedTestHousehold(db, "home");
  other = await seedTestHousehold(db, "other");
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
}, DB_HOOK_TIMEOUT);

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

/** Adds one account to the home Household for each institution, in this order after the seeded accounts. */
async function addAccounts(institutions: readonly string[]) {
  const ids = institutions.map(() => randomUUID());
  await db.insert(accounts).values(
    institutions.map((institution, index) => ({
      id: ids[index],
      householdId: home.householdId,
      groupId: home.liquidGroupId,
      name: `Account ${String(index + 1)}`,
      institution,
      kind: "cash" as const,
      currency: "GBP",
      position: index + 1,
      version: 0,
    })),
  );
  return ids;
}

/** Bank 1 to Bank `count`, each with a domain and an icon. */
function banks(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const name = `Bank ${String(index + 1)}`;
    const domain = `bank${String(index + 1)}.com`;
    answers.set(name, domain);
    sites.set(domain, icon(index + 10));
    return name;
  });
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

  it("reuses another Household's guess and icon without asking the model again", async () => {
    await setInstitution(home, home.currentId, { institution: "Wise" });
    await refresh();
    await setInstitution(other, other.currentId, { institution: "WISE" });

    const result = await refresh(other.householdId);

    expect(guesses.map((guess) => guess.name)).toEqual(["Wise"]);
    expect(fetches).toEqual(["wise.com"]);
    expect(result).toEqual({ guessed: 0, fetched: 0, failed: 0, updated: 1 });
    expect(await accountRow(other.currentId)).toMatchObject({
      guessedInstitutionDomain: "wise.com",
    });
  });

  it("keeps a separate guess for each pair of currencies that the model sees with a name", async () => {
    answers.set("Chase GBP/GBP", "chase.co.uk");
    answers.set("Chase GBP/USD", "chase.com");
    answers.set("Chase USD/USD", "chase.com");
    sites.set("chase.co.uk", icon(5));
    sites.set("chase.com", icon(6));
    await setInstitution(home, home.currentId, { institution: "Chase" });
    await setInstitution(home, home.savingsId, {
      institution: "Chase",
      currency: "USD",
    });
    await db
      .update(households)
      .set({ baseCurrency: "USD" })
      .where(eq(households.id, other.householdId));
    await setInstitution(other, other.currentId, {
      institution: "Chase",
      currency: "USD",
    });

    await refresh();
    await refresh(other.householdId);

    expect(guesses).toEqual([
      {
        name: "Chase",
        hints: { baseCurrency: "GBP", accountCurrency: "GBP" },
      },
      {
        name: "Chase",
        hints: { baseCurrency: "GBP", accountCurrency: "USD" },
      },
      {
        name: "Chase",
        hints: { baseCurrency: "USD", accountCurrency: "USD" },
      },
    ]);
    const cached = await db
      .select({
        nameKey: institutionDomainGuesses.nameKey,
        baseCurrency: institutionDomainGuesses.baseCurrency,
        accountCurrency: institutionDomainGuesses.accountCurrency,
        domain: institutionDomainGuesses.domain,
      })
      .from(institutionDomainGuesses);
    expect(cached).toHaveLength(3);
    expect(cached).toEqual(
      expect.arrayContaining([
        {
          nameKey: "chase",
          baseCurrency: "GBP",
          accountCurrency: "GBP",
          domain: "chase.co.uk",
        },
        {
          nameKey: "chase",
          baseCurrency: "GBP",
          accountCurrency: "USD",
          domain: "chase.com",
        },
        {
          nameKey: "chase",
          baseCurrency: "USD",
          accountCurrency: "USD",
          domain: "chase.com",
        },
      ]),
    );
    expect(await accountRow(home.currentId)).toMatchObject({
      guessedInstitutionDomain: "chase.co.uk",
    });
    expect(await accountRow(home.savingsId)).toMatchObject({
      guessedInstitutionDomain: "chase.com",
    });
    expect(await accountRow(other.currentId)).toMatchObject({
      guessedInstitutionDomain: "chase.com",
    });
  });

  it("guesses again when the currency of an account changes, and keeps the old guess until then", async () => {
    answers.set("Chase GBP/GBP", "chase.co.uk");
    answers.set("Chase GBP/USD", null);
    sites.set("chase.co.uk", icon(5));
    await setInstitution(home, home.currentId, { institution: "Chase" });
    await refresh(home.householdId);

    await setInstitution(home, home.currentId, { currency: "USD" });
    await refresh(home.householdId, { model: false });
    expect(await accountRow(home.currentId)).toMatchObject({
      guessedInstitutionDomain: "chase.co.uk",
    });

    await refresh();
    expect(guesses.map((guess) => guess.hints.accountCurrency)).toEqual([
      "GBP",
      "USD",
    ]);
    expect(await accountRow(home.currentId)).toEqual({
      institutionDomain: null,
      guessedInstitutionDomain: null,
    });
  });

  it("does not guess for an account whose Member set its own domain", async () => {
    await setInstitution(home, home.currentId, {
      institution: "My bank",
      institutionDomain: "monzo.com",
    });

    await refresh();

    expect(guesses).toEqual([]);
    expect(fetches).toEqual(["monzo.com"]);
    expect(await accountRow(home.currentId)).toEqual({
      institutionDomain: "monzo.com",
      guessedInstitutionDomain: null,
    });
  });

  it("drops the old guess when the institution is renamed, then guesses the new name", async () => {
    await setInstitution(home, home.currentId, { institution: "Barclay" });
    await refresh();

    await setInstitution(home, home.currentId, { institution: "Wise" });
    expect(await accountRow(home.currentId)).toEqual({
      institutionDomain: null,
      guessedInstitutionDomain: null,
    });

    await refresh();
    expect(await accountRow(home.currentId)).toEqual({
      institutionDomain: null,
      guessedInstitutionDomain: "wise.com",
    });
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

  it("shows the guessed domain without an icon until a fetch works, then adds the icon", async () => {
    sites.delete("wise.com");
    await setInstitution(home, home.currentId, { institution: "Wise" });

    expect(await refresh()).toMatchObject({ fetched: 0, failed: 1 });
    expect(await accountRow(home.currentId)).toEqual({
      institutionDomain: null,
      guessedInstitutionDomain: "wise.com",
    });

    sites.set("wise.com", icon(2));
    await refresh();
    expect(fetches).toEqual(["wise.com"]);

    now = new Date(START.getTime() + HOUR_MS);
    await refresh();
    expect(fetches).toEqual(["wise.com", "wise.com"]);
    expect(await iconVersion("wise.com")).not.toBeNull();
  });

  it("fetches a Member's domain without a model, and guesses nothing", async () => {
    await setInstitution(home, home.currentId, { institution: "Wise" });
    await setInstitution(home, home.savingsId, {
      institutionDomain: "monzo.com",
    });

    await refresh(home.householdId, { model: false });

    expect(guesses).toEqual([]);
    expect(fetches).toEqual(["monzo.com"]);
    expect(await accountRow(home.currentId)).toMatchObject({
      guessedInstitutionDomain: null,
    });
  });

  it("gives up on a model call that never answers, still fetches the other icons, and tries the name again after the backoff", async () => {
    await setInstitution(home, home.currentId, { institution: "Wise" });
    await setInstitution(home, home.savingsId, {
      institutionDomain: "monzo.com",
    });
    const hang = () => new Promise<string | null>(() => {});

    expect(await refresh(home.householdId, { guessDomain: hang })).toEqual({
      guessed: 0,
      fetched: 1,
      failed: 1,
      updated: 0,
    });
    expect(fetches).toEqual(["monzo.com"]);

    now = new Date(START.getTime() + HOUR_MS);
    expect(await refresh()).toMatchObject({ guessed: 1, updated: 1 });
    expect(await accountRow(home.currentId)).toMatchObject({
      guessedInstitutionDomain: "wise.com",
    });
  });

  it("guesses every name and fetches every icon in one run, also when there are more than ten", async () => {
    const names = banks(15);
    const ids = await addAccounts(names);

    expect(await refresh()).toEqual({
      guessed: 15,
      fetched: 15,
      failed: 0,
      updated: 15,
    });
    expect(guesses.map((guess) => guess.name).toSorted()).toEqual(
      names.toSorted(),
    );
    expect(await accountRow(ids[14])).toMatchObject({
      guessedInstitutionDomain: "bank15.com",
    });
    expect(await iconVersion("bank15.com")).not.toBeNull();
  });

  it("guesses the names of the most accounts first, then in account order, when the run ends before all are guessed", async () => {
    const singles = banks(6);
    answers.set("Chase", "chase.co.uk");
    answers.set("Monzo", "monzo.com");
    await addAccounts([
      ...singles,
      "Monzo",
      "Monzo",
      "Chase",
      "Chase",
      "Chase",
    ]);

    const result = await refresh(home.householdId, {
      endsAt: START.getTime() + 1000,
      guessDomain: (name) => {
        guesses.push({
          name,
          hints: { baseCurrency: "", accountCurrency: "" },
        });
        now = new Date(now.getTime() + HOUR_MS);
        return Promise.resolve(answers.get(name) ?? null);
      },
    });

    expect(guesses.map((guess) => guess.name).toSorted()).toEqual([
      "Bank 1",
      "Bank 2",
      "Chase",
      "Monzo",
    ]);
    expect(fetches).toEqual([]);
    expect(result).toEqual({ guessed: 4, fetched: 0, failed: 0, updated: 7 });
  });

  it("starts no model call or fetch that could not end before the end of the run", async () => {
    await setInstitution(home, home.currentId, { institution: "Wise" });

    expect(
      await refresh(home.householdId, { endsAt: START.getTime() + 49 }),
    ).toEqual({ guessed: 0, fetched: 0, failed: 0, updated: 0 });
    expect(await db.$count(institutionDomainGuesses)).toBe(0);

    expect(
      await refresh(home.householdId, { endsAt: START.getTime() + 50 }),
    ).toEqual({ guessed: 1, fetched: 1, failed: 0, updated: 1 });
  });

  it("shares the names between two overlapping runs, so that together they guess each name once", async () => {
    const names = banks(14);
    const ids = await addAccounts(names);

    const [first, second] = await Promise.all([refresh(), refresh()]);

    expect(first.guessed + second.guessed).toBe(14);
    expect(first.failed + second.failed).toBe(0);
    expect(guesses.map((guess) => guess.name).toSorted()).toEqual(
      names.toSorted(),
    );
    for (const [index, id] of ids.entries()) {
      expect(await accountRow(id)).toMatchObject({
        guessedInstitutionDomain: `bank${String(index + 1)}.com`,
      });
    }
  });

  it("moves no clock when nothing changes", async () => {
    const before = await pullChanges(db, home.householdId, 0);

    expect(await refresh()).toEqual({
      guessed: 0,
      fetched: 0,
      failed: 0,
      updated: 0,
    });
    expect((await pullChanges(db, home.householdId, 0)).clock).toBe(
      before.clock,
    );
  });
});
