import { handleCare } from "#src/server/care/handle-care.ts";
import { getBuddyDb } from "#src/server/db/get-buddy-db.ts";
import { clientIp } from "#src/server/http/client-ip.ts";
import { getBuddyBackend } from "#src/server/store/get-buddy-backend.ts";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/v1/u/[user]/care">,
) {
  const { user } = await params;
  return handleCare(request, user, {
    kv: getBuddyBackend().kv,
    getDb: getBuddyDb,
    now: () => new Date(),
    clientIp,
  });
}
