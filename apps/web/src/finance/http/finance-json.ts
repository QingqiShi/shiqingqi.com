/** Every Finance API response is private to the signed-in Household and never cached. */
export const FINANCE_NO_STORE = "private, no-store";

/** A JSON response that no cache keeps. */
export function financeJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", FINANCE_NO_STORE);
  return Response.json(body, { ...init, headers });
}
