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
    // `any` type required here to handle required fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
