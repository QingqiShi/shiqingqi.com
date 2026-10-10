import { FinanceApiError } from "./finance-api-error.ts";

/**
 * Sends a same-origin JSON request to a Finance route. On a refusal it throws
 * `FinanceApiError` with the body's `error` code, or `fallbackCode` when the
 * body has none, and the body itself.
 */
export async function financeFetch(
  path: string,
  init: RequestInit = {},
  fallbackCode = "request-failed",
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const code =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : fallbackCode;
    throw new FinanceApiError(code, response.status, data);
  }
  return response;
}
