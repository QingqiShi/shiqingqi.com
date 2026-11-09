import {
  authenticateSignedRead,
  type SignedReadDeps,
} from "../upload/authenticate-signed-read.ts";
import { careKeys, countersOf } from "./care-keys.ts";

/**
 * `GET /api/v1/u/[user]/visitors`, signed by a connected Mac as the others
 * read is: how often the page's visitors watered and patted the pet. One MGET
 * reads the Mac's key and both counts, and every auth failure, also for a
 * private or unknown name, gets the same 401.
 */
export async function handleVisitorsRead(
  request: Request,
  user: string,
  deps: SignedReadDeps,
): Promise<Response> {
  const read = await authenticateSignedRead(
    request,
    user,
    deps,
    careKeys(user),
  );
  if (!read) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(
    { visitors: countersOf(read.values) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
