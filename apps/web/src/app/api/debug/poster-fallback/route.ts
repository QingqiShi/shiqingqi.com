import { NextResponse, type NextRequest } from "next/server";

/**
 * Diagnostic sink for {@link reportPosterFallback}. Records why a media poster
 * fell back to the "No Poster" tile so a device-specific, hard-to-reproduce
 * production failure can be pinned to config-missing vs image-error. Emits to
 * Vercel Runtime Logs (searchable by the `[poster-fallback]` prefix).
 *
 * Safe to remove once the root cause is confirmed.
 */
export async function POST(request: NextRequest) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    // Empty or non-JSON body; still record the bare event below.
  }
  console.error("[poster-fallback]", JSON.stringify(payload));
  return new NextResponse(null, { status: 204 });
}
