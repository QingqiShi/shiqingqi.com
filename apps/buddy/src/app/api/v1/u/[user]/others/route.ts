import { requireAuthSecret } from "#src/server/auth/get-auth-secret.ts";
import { handleOthersRead } from "#src/server/snapshot/handle-others-read.ts";
import { getBuddyBackend } from "#src/server/store/get-buddy-backend.ts";

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/v1/u/[user]/others">,
) {
  const { user } = await params;
  return handleOthersRead(request, user, {
    kv: getBuddyBackend().kv,
    secret: requireAuthSecret(),
    now: Date.now,
  });
}
