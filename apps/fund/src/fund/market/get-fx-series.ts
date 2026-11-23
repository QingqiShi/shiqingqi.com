import type { FundDb } from "#src/db/types.ts";
import { FX_SYMBOL } from "../guardrails.ts";
import type { FxSeries } from "../types.ts";
import { getBars } from "./get-bars.ts";

/** USD for one GBP at the close of the last `sessions` days before `before`, oldest first. */
export async function getFxSeries(
  db: FundDb,
  { before, sessions }: { before: string; sessions: number },
): Promise<FxSeries> {
  const bars = await getBars(db, [FX_SYMBOL], { before, sessions });
  return (bars.get(FX_SYMBOL) ?? []).map(({ date, close }) => ({
    date,
    gbpUsd: close,
  }));
}
