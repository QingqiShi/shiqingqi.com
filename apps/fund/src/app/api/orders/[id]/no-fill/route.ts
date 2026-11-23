import { z } from "zod";
import { json, signedInRoute } from "#src/auth/signed-in-route.ts";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { reportLanguageFromEnv } from "#src/fund/agents/prompts.ts";
import { DeskError } from "#src/fund/desk/desk-error.ts";
import { recordNoFill } from "#src/fund/desk/record-no-fill.ts";

const bodySchema = z.object({ through: z.iso.date() });

/** The owner says an order did not trade in any session up to `through`. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/orders/[id]/no-fill">,
) {
  const id = z.uuid().safeParse((await ctx.params).id);
  return signedInRoute(bodySchema, async ({ through }) => {
    if (!id.success) return json({ error: "There is no such order." }, 404);
    try {
      await recordNoFill(getFundDb(), {
        orderId: id.data,
        through,
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
