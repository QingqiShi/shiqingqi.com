import type { NextRequest } from "next/server";
import { performAISearch } from "@/utils/ai-search";
import { apiRouteWrapper } from "@/utils/api-route-wrapper";

export const GET = apiRouteWrapper(performAISearch);

export async function POST(request: NextRequest) {
  // Use the same apiRouteWrapper pattern but handle JSON body for POST
  const referer = request.headers.get("Referer") ?? "";
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const { ALLOWED_REFERER } = await import("@/constants");
      if (
        !ALLOWED_REFERER.some((allowedReferer) =>
          refererUrl.origin.endsWith(allowedReferer),
        )
      ) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
      }
    } catch {
      // Invalid referer URL, but allow the request to proceed
    }
  }

  try {
    const body = (await request.json()) as { query: string; locale?: string };
    const result = await performAISearch(body);
    return Response.json(result);
  } catch (error) {
    console.error("AI Search POST error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
