import type { NextRequest } from "next/server";
import { z } from "zod";
import { performAISearch, searchParamsSchema } from "#src/utils/ai-search.ts";
import { apiRouteWrapper } from "#src/utils/api-route-wrapper.ts";

export const GET = apiRouteWrapper(performAISearch);

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const params = searchParamsSchema.parse(body);
    const result = await performAISearch(params);
    return Response.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }
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
