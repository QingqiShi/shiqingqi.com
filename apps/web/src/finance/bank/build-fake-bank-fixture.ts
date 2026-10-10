import { createHash } from "node:crypto";
import { fakeBankRepository } from "../db/repositories/fake-bank-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { valuationRepository } from "../db/repositories/valuation-repository.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import type { FakeBankFixture } from "./lunchflow/create-fake-bank-client.ts";
import type { ProviderTransaction } from "./lunchflow/types.ts";

/** How far back the fake bank shows the Household's own Transactions. */
const FAKE_HISTORY_DAYS = 90;

const UNKNOWN_MERCHANTS = [
  { text: "PRET A MANGER 2041 LONDON", amountMinor: -485, phase: 0 },
  { text: "TFL TRAVEL CH", amountMinor: -280, phase: 3 },
  { text: "AMZNMKTPLACE*2K4LM", amountMinor: -1299, phase: 6 },
];
const UNKNOWN_PERIOD_DAYS = 10;

function hashOf(text: string) {
  return createHash("sha256").update(text).digest().readUInt32BE(0);
}

/** A Payee name as a bank statement prints it, varied but the same each time for one Transaction. */
function bankStyle(name: string, transactionId: string) {
  const upper = name.toUpperCase();
  const hash = hashOf(transactionId);
  const code = String(hash % 10_000).padStart(4, "0");
  switch (hash % 3) {
    case 0: {
      return upper;
    }
    case 1: {
      return `${upper} ${code} LONDON GB`;
    }
    default: {
      return `${upper}*${code}`;
    }
  }
}

function row(
  id: string,
  date: string,
  amountMinor: number,
  currency: string,
  text: string,
): ProviderTransaction {
  return {
    id,
    date,
    amountMinor,
    currency,
    merchant: "",
    description: text,
    raw: { fake: true },
  };
}

/** The latest day on or before `today` whose epoch day leaves `phase` over a 10-day cycle. */
function cycleDay(today: string, phase: number) {
  const offset =
    (((toEpochDay(today) - phase) % UNKNOWN_PERIOD_DAYS) +
      UNKNOWN_PERIOD_DAYS) %
    UNKNOWN_PERIOD_DAYS;
  return addDays(today, -offset);
}

/**
 * A fake bank built from the Household's own data, so matching and Review
 * can be shown with no Lunch Flow key (design §7.1). Each cash or credit
 * account is a provider account. Its rows are the account's posted Entries
 * of the last 90 days as bank-style strings, three unknown merchants, and
 * one Entry with an amount 1p off. The balance is ours, moved by what the
 * bank has that we do not yet have and by the Entry it shows 1p off.
 */
export async function buildFakeBankFixture(
  scope: RepositoryScope,
  today: string,
): Promise<FakeBankFixture> {
  const accounts = await fakeBankRepository.linkableAccounts(scope);
  const posted = await fakeBankRepository.postedEntries(
    scope,
    addDays(today, -FAKE_HISTORY_DAYS),
  );
  const known = await fakeBankRepository.knownProviderIds(scope);
  const fixture: FakeBankFixture = {
    accounts: [],
    transactions: {},
    balances: {},
  };

  for (const account of accounts) {
    const providerId = `fake-${account.id}`;
    fixture.accounts.push({
      id: providerId,
      connectionId: "fake",
      name: account.name,
      institution: account.institution || "Demo Bank",
      institutionLogo: null,
      provider: "fake",
      currency: account.currency,
      status: "ACTIVE",
    });

    const own = posted.filter((entry) => entry.accountId === account.id);
    const offEntry =
      own.find((entry) => known.has(`fake-off-${entry.transactionId}`)) ??
      own.findLast(
        (entry) => entry.kind === "expense" && entry.amountMinor < 0,
      );
    const rows: ProviderTransaction[] = [];
    let unseen = 0;

    for (const entry of own) {
      const text = bankStyle(
        entry.payeeName ?? (entry.note || "CARD PAYMENT"),
        entry.transactionId,
      );
      if (entry === offEntry) {
        const id = `fake-off-${entry.transactionId}`;
        rows.push(
          row(id, entry.date, entry.amountMinor - 1, account.currency, text),
        );
        if (!known.has(id)) unseen += entry.amountMinor - 1;
        unseen -= entry.amountMinor;
        continue;
      }
      rows.push(
        row(
          `fake-${entry.transactionId}`,
          entry.date,
          entry.amountMinor,
          account.currency,
          text,
        ),
      );
    }

    const oldest = addDays(today, -FAKE_HISTORY_DAYS);
    for (const [index, merchant] of UNKNOWN_MERCHANTS.entries()) {
      const latest = cycleDay(today, merchant.phase);
      for (
        let date = latest;
        date >= oldest;
        date = addDays(date, -UNKNOWN_PERIOD_DAYS)
      ) {
        const id = `fake-unknown-${String(index)}-${account.id}-${date}`;
        if (date !== latest && !known.has(id)) continue;
        rows.push(
          row(id, date, merchant.amountMinor, account.currency, merchant.text),
        );
        if (!known.has(id)) unseen += merchant.amountMinor;
      }
    }

    fixture.transactions[providerId] = rows.sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const ours = await valuationRepository.balanceAt(scope, account.id, today);
    fixture.balances[providerId] = {
      amountMinor: ours + unseen,
      currency: account.currency,
    };
  }
  return fixture;
}
