import type { NextRequest } from "next/server";
import { performAISearch } from "#src/utils/ai-search.ts";
import { apiRouteWrapper } from "#src/utils/api-route-wrapper.ts";

export const GET = apiRouteWrapper(performAISearch);

export async function POST(request: NextRequest) {
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
