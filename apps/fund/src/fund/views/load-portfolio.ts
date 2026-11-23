import { asc, eq } from "drizzle-orm";
import "server-only";
import type { FundDb } from "#src/db/types.ts";
import { orders } from "../fund-schema.ts";
import { instrumentOf } from "../ledger/instrument-of.ts";
import { formatPrice } from "../orders/format-price.ts";
import type { FundState } from "./load-fund-state.ts";
import { orderView, type OrderView } from "./order-view.ts";

export interface PositionView {
  symbol: string;
  name: string;
  quantity: number;
  /** Shares that may be sold today. */
  unlockedQuantity: number;
  /** The first date a locked share unlocks, and the date the last one does. */
  nextUnlockOn: string | null;
  lastUnlockOn: string | null;
  /** What a share cost, fees left out, as the broker quotes it. */
  averageCostText: string;
  lastText: string;
  valueGbp: number;
  weightPct: number;
  pnlGbp: number;
  pnlPct: number;
}

export type OpenOrderView = OrderView;

export interface FillView {
  id: string;
  filledOn: string;
  side: "buy" | "sell";
  quantity: number;
  symbol: string;
  name: string;
  priceText: string;
  feesGbp: number;
}

export interface PortfolioView {
  positions: PositionView[];
  openOrders: OpenOrderView[];
  /** Newest first. */
  fills: FillView[];
}

/** The positions, the open orders and the fills, ready for the Portfolio tab. */
export async function loadPortfolio(
  db: FundDb,
  state: FundState,
): Promise<PortfolioView> {
  const instrumentFor = instrumentOf(state.instruments);
  const fillById = new Map(state.fills.map((fill) => [fill.id, fill]));

  const positions = state.portfolio.positions
    .map((position): PositionView => {
      const instrument = instrumentFor(position.symbol);
      const paid = position.lots.reduce(
        (sum, lot) =>
          sum + lot.quantity * (fillById.get(lot.fillId)?.price ?? 0),
        0,
      );
      const locked = position.lots
        .filter((lot) => lot.unlockOn > state.today)
        .map((lot) => lot.unlockOn)
        .sort();
      return {
        symbol: position.symbol,
        name: instrument.name,
        quantity: position.quantity,
        unlockedQuantity: position.unlockedQuantity,
        nextUnlockOn: locked.at(0) ?? null,
        lastUnlockOn: locked.at(-1) ?? null,
        averageCostText: formatPrice(paid / position.quantity, instrument),
        lastText: formatPrice(position.price, instrument),
        valueGbp: position.marketValueGbp,
        weightPct: position.weightPct,
        pnlGbp: position.unrealisedPnlGbp,
        pnlPct:
          position.costGbp === 0
            ? 0
            : (position.unrealisedPnlGbp / position.costGbp) * 100,
      };
    })
    .sort((a, b) => b.valueGbp - a.valueGbp);

  const openRows = await db
    .select()
    .from(orders)
    .where(eq(orders.status, "open"))
    .orderBy(asc(orders.validUntil), asc(orders.symbol));

  return {
    positions,
    openOrders: openRows.map((order) =>
      orderView(order, instrumentFor(order.symbol)),
    ),
    fills: state.fills
      .map((fill) => {
        const instrument = instrumentFor(fill.symbol);
        return {
          id: fill.id,
          filledOn: fill.filledOn,
          side: fill.side,
          quantity: fill.quantity,
          symbol: fill.symbol,
          name: instrument.name,
          priceText: formatPrice(fill.price, instrument),
          feesGbp: fill.feesGbp,
        };
      })
      .reverse(),
  };
}
