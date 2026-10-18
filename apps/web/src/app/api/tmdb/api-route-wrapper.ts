import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";

/**
 * Makes it easier to create dynamic routes (route handlers) for server actions.
 * Doing this instead of using server actions directly from the client because the docs
 * say server actions are not meant for data fetching. In practice, calling server actions
 * during render (suspense query does this) causes problems with updating states in
 * Route provider.
 */
export function apiRouteWrapper<Params>(
  serverFunction: (params: Params) => Promise<unknown>,
  // The query values stay strings. A server function only adds them to the
  // TMDB URL. Thus it can use a string where its type has a number.
  searchParamsSchema: z.ZodType<NoInfer<Params>>,
) {
  return async function routeHandler(request: NextRequest) {
    try {
      const result = await serverFunction(
        searchParamsSchema.parse(
          Object.fromEntries(request.nextUrl.searchParams.entries()),
        ),
      );

      return NextResponse.json(result);
    } catch (error) {
      console.error("API route error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
