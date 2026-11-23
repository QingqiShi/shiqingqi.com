import { eq } from "drizzle-orm";
import { z } from "zod";
import { json, signedInRoute } from "#src/auth/signed-in-route.ts";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { runs } from "#src/fund/fund-schema.ts";
import { advanceAfterResponse } from "#src/fund/meeting/advance-after-response.ts";

export const maxDuration = 800;

/** Continues a run that paused or failed, from its first step that is not done. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/meetings/[id]/resume">,
) {
  const id = z.uuid().safeParse((await ctx.params).id);
  return signedInRoute(z.unknown(), async () => {
    const run = id.success
      ? (
          await getFundDb()
            .select({ id: runs.id, status: runs.status })
            .from(runs)
            .where(eq(runs.id, id.data))
        ).at(0)
      : undefined;
    if (!run) return json({ error: "not_found" }, 404);
    if (run.status === "completed") return json({ status: "completed" });
    advanceAfterResponse(run.id);
    return json({ status: "running", runId: run.id });
  })(request);
}
