import { and, eq, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import type { InstitutionHints } from "../ai/guess-institution-domain.ts";
import { institutionDomainGuesses, institutionIcons } from "../db/schema.ts";
import type { FinanceAppDb } from "../db/with-household.ts";
import {
  institutionDomainOf,
  type InstitutionDomainFields,
} from "../domain/accounts/institution-fields-after.ts";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** How long a claim holds a guess key or a domain before another worker may take it. */
const CLAIM_MS = 5 * 60 * 1000;
const ICON_REFRESH_MS = 30 * DAY_MS;

/** The wait before the next try after `attempts` failed tries: an hour, growing four times each try, up to a week. */
function backoffMs(attempts: number) {
  return Math.min(HOUR_MS * 4 ** Math.max(attempts - 1, 0), 7 * DAY_MS);
}

function after(now: Date, ms: number) {
  return new Date(now.getTime() + ms);
}

/** What a guess depends on: the normalised name and every hint that the model sees with it. */
export interface DomainGuessKey extends InstitutionHints {
  nameKey: string;
}

/** One string for each guess key, to use as a Map key. */
export function domainGuessKeyId(key: DomainGuessKey) {
  return JSON.stringify([key.nameKey, key.baseCurrency, key.accountCurrency]);
}

const hasIcon = and(
  isNotNull(institutionIcons.image),
  isNotNull(institutionIcons.version),
);

/**
 * The version of the cached icon of the domain that `account` shows, from
 * `versions` by domain; null when that domain has no icon.
 */
export function institutionIconVersionOf(
  account: InstitutionDomainFields,
  versions: ReadonlyMap<string, string | null>,
) {
  const domain = institutionDomainOf(account);
  return domain === null ? null : (versions.get(domain) ?? null);
}

function isGuessFor(key: DomainGuessKey) {
  return and(
    eq(institutionDomainGuesses.nameKey, key.nameKey),
    eq(institutionDomainGuesses.baseCurrency, key.baseCurrency),
    eq(institutionDomainGuesses.accountCurrency, key.accountCurrency),
  );
}

/**
 * The global caches of institution domains and icons. They hold no
 * Household data: the key of a guess is an institution name with two
 * currencies, and only the model writes a guess, never a Member's own domain.
 */
export const institutionCacheRepository = {
  /**
   * The guesses among `keys`, by `domainGuessKeyId`: `answers` holds each
   * answered guess (null when the name is not an institution), and
   * `waiting` each unanswered key whose next try is not due at `now`.
   */
  async findGuesses(
    db: FinanceAppDb,
    keys: readonly DomainGuessKey[],
    now: Date,
  ) {
    const answers = new Map<string, string | null>();
    const waiting = new Set<string>();
    if (keys.length === 0) return { answers, waiting };
    const rows = await db
      .select({
        nameKey: institutionDomainGuesses.nameKey,
        baseCurrency: institutionDomainGuesses.baseCurrency,
        accountCurrency: institutionDomainGuesses.accountCurrency,
        domain: institutionDomainGuesses.domain,
        guessedAt: institutionDomainGuesses.guessedAt,
        nextAttemptAt: institutionDomainGuesses.nextAttemptAt,
      })
      .from(institutionDomainGuesses)
      .where(or(...keys.map(isGuessFor)));
    for (const row of rows) {
      const id = domainGuessKeyId(row);
      if (row.guessedAt !== null) answers.set(id, row.domain);
      else if (row.nextAttemptAt > now) waiting.add(id);
    }
    return { answers, waiting };
  },

  /** Claims the key for one guess and returns the count of tries so far. Null when it has an answer, or another worker holds it, or its retry is not due. */
  async claimGuess(db: FinanceAppDb, key: DomainGuessKey, now: Date) {
    const claimed = await db
      .insert(institutionDomainGuesses)
      .values({ ...key, attempts: 1, nextAttemptAt: after(now, CLAIM_MS) })
      .onConflictDoUpdate({
        target: [
          institutionDomainGuesses.nameKey,
          institutionDomainGuesses.baseCurrency,
          institutionDomainGuesses.accountCurrency,
        ],
        set: {
          attempts: sql`${institutionDomainGuesses.attempts} + 1`,
          nextAttemptAt: after(now, CLAIM_MS),
        },
        setWhere: and(
          isNull(institutionDomainGuesses.guessedAt),
          lte(institutionDomainGuesses.nextAttemptAt, now),
        ),
      })
      .returning({ attempts: institutionDomainGuesses.attempts });
    return claimed.at(0)?.attempts ?? null;
  },

  async saveGuess(
    db: FinanceAppDb,
    key: DomainGuessKey,
    domain: string | null,
    now: Date,
  ) {
    await db
      .update(institutionDomainGuesses)
      .set({ domain, guessedAt: now, nextAttemptAt: now })
      .where(isGuessFor(key));
  },

  /** Records a failed try: the next one waits longer after each failure. */
  async failGuess(
    db: FinanceAppDb,
    key: DomainGuessKey,
    attempts: number,
    now: Date,
  ) {
    await db
      .update(institutionDomainGuesses)
      .set({ nextAttemptAt: after(now, backoffMs(attempts)) })
      .where(isGuessFor(key));
  },

  /**
   * The domains among `domains` whose first fetch, refresh or retry is due
   * at `now`, and the icon version of each of `domains`: null when it has no
   * icon.
   */
  async findIconsToRefresh(
    db: FinanceAppDb,
    domains: readonly string[],
    now: Date,
  ) {
    const versions = new Map<string, string | null>(
      domains.map((domain) => [domain, null]),
    );
    if (domains.length === 0) return { due: [], versions };
    const rows = await db
      .select({
        domain: institutionIcons.domain,
        nextAttemptAt: institutionIcons.nextAttemptAt,
        version: sql<
          string | null
        >`case when ${hasIcon} then ${institutionIcons.version} end`,
      })
      .from(institutionIcons)
      .where(inArray(institutionIcons.domain, [...domains]));
    const notDue = new Set<string>();
    for (const row of rows) {
      if (row.nextAttemptAt > now) notDue.add(row.domain);
      versions.set(row.domain, row.version);
    }
    return { due: domains.filter((domain) => !notDue.has(domain)), versions };
  },

  /** The icon version of each domain among `domains` that has an icon, by domain. */
  async findIconVersions(db: FinanceAppDb, domains: readonly string[]) {
    if (domains.length === 0) return new Map<string, string>();
    const rows = await db
      .select({
        domain: institutionIcons.domain,
        version: sql<string>`${institutionIcons.version}`,
      })
      .from(institutionIcons)
      .where(and(inArray(institutionIcons.domain, [...domains]), hasIcon));
    return new Map(rows.map((row) => [row.domain, row.version]));
  },

  /** The icon image of the domain, or null when it has no icon. */
  async findIconImage(db: FinanceAppDb, domain: string) {
    const rows = await db
      .select({ image: institutionIcons.image })
      .from(institutionIcons)
      .where(and(eq(institutionIcons.domain, domain), hasIcon));
    return rows.at(0)?.image ?? null;
  },

  /** Claims the domain for one fetch and returns the count of tries since the last success. Null when another worker holds it, or its refresh or retry is not due. */
  async claimIcon(db: FinanceAppDb, domain: string, now: Date) {
    const claimed = await db
      .insert(institutionIcons)
      .values({ domain, attempts: 1, nextAttemptAt: after(now, CLAIM_MS) })
      .onConflictDoUpdate({
        target: institutionIcons.domain,
        set: {
          attempts: sql`${institutionIcons.attempts} + 1`,
          nextAttemptAt: after(now, CLAIM_MS),
        },
        setWhere: lte(institutionIcons.nextAttemptAt, now),
      })
      .returning({ attempts: institutionIcons.attempts });
    return claimed.at(0)?.attempts ?? null;
  },

  async saveIcon(
    db: FinanceAppDb,
    domain: string,
    icon: { image: Uint8Array; version: string },
    now: Date,
  ) {
    await db
      .update(institutionIcons)
      .set({
        ...icon,
        attempts: 0,
        nextAttemptAt: after(now, ICON_REFRESH_MS),
      })
      .where(eq(institutionIcons.domain, domain));
  },

  /** Records a failed fetch the way `failGuess` does. An icon fetched before stays. */
  async failIcon(
    db: FinanceAppDb,
    domain: string,
    attempts: number,
    now: Date,
  ) {
    await db
      .update(institutionIcons)
      .set({ nextAttemptAt: after(now, backoffMs(attempts)) })
      .where(eq(institutionIcons.domain, domain));
  },
};
