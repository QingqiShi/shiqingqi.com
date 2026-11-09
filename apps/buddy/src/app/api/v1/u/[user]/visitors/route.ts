import { requireAuthSecret } from "#src/server/auth/get-auth-secret.ts";
import { handleVisitorsRead } from "#src/server/care/handle-visitors-read.ts";
import { getBuddyBackend } from "#src/server/store/get-buddy-backend.ts";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/v1/u/[user]/visitors">,
) {
  const { user } = await params;
  return handleVisitorsRead(request, user, {
    kv: getBuddyBackend().kv,
    secret: requireAuthSecret(),
    now: Date.now,
  });
}
