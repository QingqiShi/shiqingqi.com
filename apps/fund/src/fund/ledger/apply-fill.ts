import { GUARDRAILS } from "../guardrails.ts";
import type { Fill, Lot, Position } from "../types.ts";
import { addDays } from "./add-days.ts";
import { roundPennies } from "./round-pennies.ts";

export type LedgerFill = Pick<
  Fill,
  | "id"
  | "symbol"
  | "side"
  | "quantity"
  | "price"
  | "gbpUsd"
  | "feesGbp"
  | "filledOn"
> & { createdAt?: Date };

export interface LedgerState {
  cashGbp: number;
  realisedPnlGbp: number;
  /** Open lots of each symbol, oldest first. */
  lots: Map<string, Lot[]>;
}

export function emptyLedger(cashGbp = 0, realisedPnlGbp = 0): LedgerState {
  return { cashGbp, realisedPnlGbp, lots: new Map() };
}

/** Oldest first; fills of one day keep the order they were recorded in. */
export function compareFills(a: LedgerFill, b: LedgerFill): number {
  if (a.filledOn !== b.filledOn) return a.filledOn < b.filledOn ? -1 : 1;
  const created = (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
  if (created !== 0) return created;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function applyFill(state: LedgerState, fill: LedgerFill): void {
  const grossGbp = (fill.quantity * fill.price) / fill.gbpUsd;
  const lots = state.lots.get(fill.symbol) ?? [];
  if (fill.side === "buy") {
    const costGbp = roundPennies(grossGbp + fill.feesGbp);
    state.cashGbp = roundPennies(state.cashGbp - costGbp);
    lots.push({
      fillId: fill.id,
      openedOn: fill.filledOn,
      unlockOn: addDays(fill.filledOn, GUARDRAILS.minHoldDays),
      quantity: fill.quantity,
      costGbpPerShare: costGbp / fill.quantity,
    });
    state.lots.set(fill.symbol, lots);
    return;
  }

  const held = lots.reduce((sum, lot) => sum + lot.quantity, 0);
  if (fill.quantity > held) {
    throw new Error(
      `Fill ${fill.id} sells ${String(fill.quantity)} ${fill.symbol} on ${fill.filledOn}, but the fund holds ${String(held)}.`,
    );
  }
  const proceedsGbp = roundPennies(grossGbp - fill.feesGbp);
  let left = fill.quantity;
  let soldCostGbp = 0;
  while (left > 0) {
    const lot = lots[0];
    const taken = Math.min(left, lot.quantity);
    soldCostGbp += taken * lot.costGbpPerShare;
    lot.quantity -= taken;
    left -= taken;
    if (lot.quantity === 0) lots.shift();
  }
  state.cashGbp = roundPennies(state.cashGbp + proceedsGbp);
  state.realisedPnlGbp = roundPennies(
    state.realisedPnlGbp + proceedsGbp - roundPennies(soldCostGbp),
  );
  if (lots.length === 0) state.lots.delete(fill.symbol);
}

export function positionsOf(state: LedgerState, asOf: string): Position[] {
  return [...state.lots.entries()]
    .filter(([, lots]) => lots.length > 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([symbol, lots]) => ({
      symbol,
      quantity: lots.reduce((sum, lot) => sum + lot.quantity, 0),
      unlockedQuantity: lots
        .filter((lot) => lot.unlockOn <= asOf)
        .reduce((sum, lot) => sum + lot.quantity, 0),
      costGbp: roundPennies(
        lots.reduce((sum, lot) => sum + lot.quantity * lot.costGbpPerShare, 0),
      ),
      lots: lots.map((lot) => ({ ...lot })),
    }));
}
