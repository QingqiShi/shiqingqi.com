import type { CashEntry, Portfolio } from "../types.ts";
import {
  applyFill,
  compareFills,
  emptyLedger,
  positionsOf,
  type LedgerFill,
} from "./apply-fill.ts";
import { roundPennies } from "./round-pennies.ts";

export type LedgerCashEntry = Pick<CashEntry, "date" | "kind" | "amountGbp">;

export interface DerivePortfolioInput {
  fills: readonly LedgerFill[];
  cashEntries: readonly LedgerCashEntry[];
  asOf: string;
}

export function derivePortfolio({
  fills,
  cashEntries,
  asOf,
}: DerivePortfolioInput): Portfolio {
  let entriesGbp = 0;
  let dividendsGbp = 0;
  for (const entry of cashEntries) {
    if (entry.date > asOf) continue;
    entriesGbp = roundPennies(entriesGbp + entry.amountGbp);
    if (entry.kind === "dividend") {
      dividendsGbp = roundPennies(dividendsGbp + entry.amountGbp);
    }
  }

  const ledger = emptyLedger(entriesGbp);
  for (const fill of fills
    .filter((f) => f.filledOn <= asOf)
    .sort(compareFills)) {
    applyFill(ledger, fill);
  }

  return {
    asOf,
    cashGbp: ledger.cashGbp,
    realisedPnlGbp: ledger.realisedPnlGbp,
    dividendsGbp,
    positions: positionsOf(ledger, asOf),
  };
}
