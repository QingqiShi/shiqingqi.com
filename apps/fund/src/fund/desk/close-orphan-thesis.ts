import { and, eq } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import { fills, orders, theses } from "../fund-schema.ts";

/**
 * Closes a position thesis that has no shares and no open order behind it,
 * as after a first buy that expired or was cancelled. Call it after the
 * order's status changed.
 */
export async function closeOrphanThesis(
  tx: FundDb,
  { thesisId, symbol }: { thesisId: string; symbol: string },
): Promise<void> {
  const open = await tx
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.thesisId, thesisId), eq(orders.status, "open")));
  if (open.length > 0) return;
  const symbolFills = await tx
    .select({ side: fills.side, quantity: fills.quantity })
    .from(fills)
    .where(eq(fills.symbol, symbol));
  const held = symbolFills.reduce(
    (sum, f) => sum + (f.side === "buy" ? f.quantity : -f.quantity),
    0,
  );
  if (held > 0) return;
  await tx
    .update(theses)
    .set({ status: "closed" })
    .where(and(eq(theses.id, thesisId), eq(theses.status, "active")));
}
