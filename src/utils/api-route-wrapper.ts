import { NextResponse, type NextRequest } from "next/server";
import { ALLOWED_REFERER } from "#src/constants.ts";

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
    const referer = request.headers.get("Referer") ?? "";
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (
          !ALLOWED_REFERER.some((allowedReferer) =>
            refererUrl.origin.endsWith(allowedReferer),
          )
        ) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
      } catch {
        // Invalid referer URL, but allow the request to proceed
      }
    }
    const result = await serverFunction(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );

    return NextResponse.json(result);
  };
}
