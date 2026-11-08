import { getRequestOrigin } from "../auth/get-request-origin.ts";

/**
 * True when the request says it comes from a page on the origin it was sent
 * to. A browser always sends `Origin` on a cross-site POST, so a request
 * without one is refused too.
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  return origin !== null && origin.toLowerCase() === getRequestOrigin(request);
}
