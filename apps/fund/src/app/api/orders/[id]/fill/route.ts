import { eq } from "drizzle-orm";
import { z } from "zod";
import { json, signedInRoute } from "#src/auth/signed-in-route.ts";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { reportLanguageFromEnv } from "#src/fund/agents/prompts.ts";
import { DeskError } from "#src/fund/desk/desk-error.ts";
import { recordFill } from "#src/fund/desk/record-fill.ts";
import { instruments, orders } from "#src/fund/fund-schema.ts";
import { toMajorUnits } from "#src/fund/orders/to-major-units.ts";

const bodySchema = z.object({
  quantity: z.number().int().positive(),
  /** Per share, in the units the market quotes: pence for London. */
  price: z.number().positive(),
  filledOn: z.iso.date(),
  feesGbp: z.number().nonnegative().optional(),
});

/** The owner says an order traded. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/orders/[id]/fill">,
) {
  const id = z.uuid().safeParse((await ctx.params).id);
  return signedInRoute(bodySchema, async (body) => {
    const db = getFundDb();
    const row = id.success
      ? (
          await db
            .select({ quoteScale: instruments.quoteScale })
            .from(orders)
            .innerJoin(instruments, eq(instruments.symbol, orders.symbol))
            .where(eq(orders.id, id.data))
        ).at(0)
      : undefined;
    if (!id.success || !row)
      return json({ error: "There is no such order." }, 404);
    try {
      await recordFill(db, {
        orderId: id.data,
        quantity: body.quantity,
        price: toMajorUnits(body.price, row),
        filledOn: body.filledOn,
        feesGbp: body.feesGbp,
        language: reportLanguageFromEnv(process.env.FUND_REPORT_LANGUAGE),
      });
    } catch (error) {
      if (error instanceof DeskError) {
        return json({ error: error.message }, error.status);
      }
      throw error;
    }
    return json({ ok: true });
  })(request);
}
