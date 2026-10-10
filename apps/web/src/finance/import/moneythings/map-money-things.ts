import { addDays } from "../../domain/dates/add-days.ts";
import { createRounder, type RoundingNote } from "./create-rounder.ts";
import { importId } from "./import-id.ts";
import { mapAccounts } from "./map-accounts.ts";
import { mapCategories } from "./map-categories.ts";
import { mapFxRates } from "./map-fx-rates.ts";
import { mapPayeesAndTags } from "./map-payees-and-tags.ts";
import { mapRules } from "./map-rules.ts";
import {
  mapTransactions,
  type MappedTransactions,
} from "./map-transactions.ts";
import { mapValuations } from "./map-valuations.ts";
import type { MapOptions } from "./types.ts";
import type { ImportRows, MemberRow, PayeeRow } from "./types.ts";
import type { SourceData } from "./types.ts";

export interface MappingReport {
  roundings: RoundingNote[];
  /** Σ (rounded − source) in minor units per account id. */
  residueByAccount: Map<string, number>;
  refundGuesses: MappedTransactions["refundGuesses"];
  counts: MappedTransactions["counts"] & {
    templatesWithoutSchedule: number;
    droppedLedgerRows: number;
  };
  unknownTagIds: string[];
}

function mostCommon(values: (string | null | undefined)[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

/** Maps a whole MoneyThings backup to Finance rows. Pure: no I/O. */
export function mapMoneyThings(
  source: SourceData,
  options: MapOptions,
): { rows: ImportRows; report: MappingReport } {
  const rounder = createRounder();
  const accounts = mapAccounts(source, options, rounder);
  const categories = mapCategories(source, options);
  const payeesAndTags = mapPayeesAndTags(source, options);
  const rules = mapRules({
    source,
    options,
    rounder,
    accounts,
    categories,
    payeesAndTags,
  });
  const ruleIdByCron = new Map(
    source.crontabs
      .map((crontab) => [crontab.id, importId("rule", crontab.id)] as const)
      .filter(([, id]) => rules.some((rule) => rule.id === id)),
  );
  const mapped = mapTransactions({
    source,
    options,
    rounder,
    accounts,
    categories,
    payeesAndTags,
    ruleIdByCron,
  });
  const valuations = mapValuations({
    source,
    options,
    rounder,
    accounts,
    linkedLedgerRowIds: mapped.linkedLedgerRowIds,
    droppedLedgerRowIds: mapped.droppedLedgerRowIds,
  });

  const postedIds = new Set(
    mapped.transactions.filter((t) => t.status === "posted").map((t) => t.id),
  );
  const lastActivity = new Map<string, string>();
  const touch = (accountId: string, day: string) => {
    const last = lastActivity.get(accountId);
    if (!last || day > last) lastActivity.set(accountId, day);
  };
  for (const entry of mapped.entries) {
    if (postedIds.has(entry.transactionId)) touch(entry.accountId, entry.date);
  }
  for (const valuation of valuations) touch(valuation.accountId, valuation.on);
  const accountRows = accounts.accounts.map((account) =>
    account.id && accounts.closedAccountIds.has(account.id)
      ? {
          ...account,
          closedOn: addDays(
            lastActivity.get(account.id) ?? options.importDate,
            1,
          ),
        }
      : account,
  );

  const categoryRows = categories.rows.filter(
    (row) =>
      !row.id ||
      !categories.optionalIds.has(row.id) ||
      mapped.usedCategoryIds.has(row.id),
  );

  const payees: PayeeRow[] = payeesAndTags.payees.map((payee) => {
    const own = mapped.transactions.filter(
      (t) => t.payeeId === payee.id && t.status === "posted",
    );
    const ownIds = new Set(own.map((t) => t.id));
    return {
      ...payee,
      defaultCategoryId: mostCommon(
        own
          .filter((t) => !(t.kind === "expense" && t.amountMinor > 0))
          .map((t) => t.categoryId),
      ),
      defaultAccountId: mostCommon(
        mapped.entries
          .filter((e) => ownIds.has(e.transactionId) && e.position === 0)
          .map((e) => e.accountId),
      ),
    };
  });

  const members: MemberRow[] = [
    {
      id: options.memberIds.husband,
      householdId: options.householdId,
      name: options.memberNames.husband,
      role: "owner",
      version: 0,
    },
    {
      id: options.memberIds.wife,
      householdId: options.householdId,
      name: options.memberNames.wife,
      role: "member",
      version: 0,
    },
  ];

  const scheduled = new Set(source.crontabs.map((c) => c.templateId));
  return {
    rows: {
      members,
      accountGroups: accounts.groups,
      accounts: accountRows,
      categories: categoryRows,
      payees,
      tags: payeesAndTags.tags,
      rules,
      valuations,
      transactions: mapped.transactions,
      entries: mapped.entries,
      transactionTags: mapped.transactionTags,
      fxRates: mapFxRates(source, options),
    },
    report: {
      roundings: rounder.notes,
      residueByAccount: rounder.residueByAccount,
      refundGuesses: mapped.refundGuesses,
      counts: {
        ...mapped.counts,
        templatesWithoutSchedule: source.templates.filter(
          (t) => !scheduled.has(t.id),
        ).length,
        droppedLedgerRows: mapped.droppedLedgerRowIds.size,
      },
      unknownTagIds: [...payeesAndTags.unknownTagIds],
    },
  };
}
