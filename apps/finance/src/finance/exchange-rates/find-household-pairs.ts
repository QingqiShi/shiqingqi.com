import { createHash } from "node:crypto";
import { and, eq, inArray, isNull, min, ne } from "drizzle-orm";
import { householdRepository } from "../db/repositories/household-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { accounts, entries, valuations } from "../db/schema.ts";
import { exchangeRateRepository } from "./exchange-rate-repository.ts";
import type {
  CurrencyPair,
  ExchangeRateRow,
} from "./exchange-rate-row-schema.ts";

export interface HouseholdPair extends CurrencyPair {
  /** The first day an Entry or a Valuation of an account in `base` falls on; null when there is none. */
  firstDay: string | null;
}

export async function findHouseholdPairs(
  scope: RepositoryScope,
  baseCurrency: string,
): Promise<CurrencyPair[]> {
  const rows = await scope.db
    .selectDistinct({ currency: accounts.currency })
    .from(accounts)
    .where(
      and(
        eq(accounts.householdId, scope.householdId),
        isNull(accounts.deletedAt),
        ne(accounts.currency, baseCurrency),
      ),
    );
  return rows
    .map((row) => row.currency)
    .sort()
    .map((base) => ({ base, quote: baseCurrency }));
}

export function householdPairsId(pairs: readonly CurrencyPair[]) {
  const text = pairs
    .map((pair) => `${pair.base}>${pair.quote}`)
    .sort()
    .join(",");
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export async function findHouseholdPairsWithFirstDays(
  scope: RepositoryScope,
): Promise<HouseholdPair[]> {
  const household = await householdRepository.find(scope);
  if (!household) return [];
  const pairs = await findHouseholdPairs(scope, household.baseCurrency);
  if (pairs.length === 0) return [];
  const ofCurrencies = and(
    eq(accounts.householdId, scope.householdId),
    isNull(accounts.deletedAt),
    inArray(
      accounts.currency,
      pairs.map((pair) => pair.base),
    ),
  );
  const entryDays = await scope.db
    .select({ currency: accounts.currency, day: min(entries.date) })
    .from(entries)
    .innerJoin(accounts, eq(accounts.id, entries.accountId))
    .where(and(ofCurrencies, isNull(entries.deletedAt)))
    .groupBy(accounts.currency);
  const valuationDays = await scope.db
    .select({ currency: accounts.currency, day: min(valuations.on) })
    .from(valuations)
    .innerJoin(accounts, eq(accounts.id, valuations.accountId))
    .where(and(ofCurrencies, isNull(valuations.deletedAt)))
    .groupBy(accounts.currency);
  const firstDays = new Map<string, string>();
  for (const { currency, day } of [...entryDays, ...valuationDays]) {
    if (day === null) continue;
    const current = firstDays.get(currency);
    if (current === undefined || day < current) firstDays.set(currency, day);
  }
  return pairs.map((pair) => ({
    ...pair,
    firstDay: firstDays.get(pair.base) ?? null,
  }));
}

export async function listHouseholdExchangeRates(
  scope: RepositoryScope,
  baseCurrency: string,
): Promise<ExchangeRateRow[]> {
  return exchangeRateRepository.listForPairs(
    scope.db,
    await findHouseholdPairs(scope, baseCurrency),
  );
}
