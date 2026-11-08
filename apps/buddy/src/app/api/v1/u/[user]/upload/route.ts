import { requireAuthSecret } from "#src/server/auth/get-auth-secret.ts";
import { getBuddyBackend } from "#src/server/store/get-buddy-backend.ts";
import { handleUpload } from "#src/server/upload/handle-upload.ts";

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/v1/u/[user]/upload">,
) {
  const { user } = await params;
  return handleUpload(request, user, {
    kv: getBuddyBackend().kv,
    secret: requireAuthSecret(),
    now: Date.now,
  });
}
