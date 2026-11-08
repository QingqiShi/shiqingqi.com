import { BuddyApiError } from "./buddy-api-error.ts";

/**
 * Sends a same-origin JSON POST to a Buddy route. On a refusal it throws
 * `BuddyApiError` with the body's `error` code, or `request_failed`.
 */
export async function postJson<T = unknown>(
  path: string,
  body: unknown = {},
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
        : "request_failed";
    throw new BuddyApiError(code, response.status);
  }
  return (await response.json()) as T;
}
