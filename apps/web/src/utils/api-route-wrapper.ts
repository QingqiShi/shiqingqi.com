import { NextResponse, type NextRequest } from "next/server";

/**
 * Makes it easier to create dynamic routes (route handlers) for server actions.
 * Doing this instead of using server actions directly from the client because the docs
 * say server actions are not meant for data fetching. In practice, calling server actions
 * during render (suspense query does this) causes problems with updating states in
 * Route provider.
 */
export function apiRouteWrapper(
  serverFunction: (
    // `params` is a `Record<string, string>` at the call below, but server
    // functions declare specific required fields (e.g. `{ movie_id: string
    // }`). Contravariance means a `never` param type would accept those
    // functions here, but then the runtime call below (a real
    // `Record<string, string>` argument) stops type-checking — there is no
    // non-`any` type that is both a valid supertype of every server
    // function's params and a valid argument type for that call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- params are contravariant across every TMDB server function; no non-any type satisfies both sides
    params: any,
  ) => Promise<unknown>,
) {
  return async function routeHandler(request: NextRequest) {
    try {
      const result = await serverFunction(
        Object.fromEntries(request.nextUrl.searchParams.entries()),
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
