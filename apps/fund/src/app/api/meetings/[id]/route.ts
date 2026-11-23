import { z } from "zod";
import { json, sessionUserId } from "#src/auth/signed-in-route.ts";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { meetingStatus } from "#src/fund/meeting/meeting-status.ts";

/**
 * The state of one run, for a page that polls it. A browser sends no Origin
 * on a same-origin GET, so this route checks only the session; the proxy
 * still asks for a Referer of this app.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/meetings/[id]">,
) {
  if ((await sessionUserId(request)) === null) {
    return json({ error: "unauthorized" }, 401);
  }
  const id = z.uuid().safeParse((await ctx.params).id);
  const status = id.success
    ? await meetingStatus(getFundDb(), id.data, new Date())
    : null;
  return status ? json(status) : json({ error: "not_found" }, 404);
}
