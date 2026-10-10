/** The message a Finance page sends the service worker to store its screens for offline use. */
export const FINANCE_PRECACHE_MESSAGE = "finance-precache";

export interface FinancePrecacheMessage {
  type: typeof FINANCE_PRECACHE_MESSAGE;
  /** Locale-prefixed page paths, such as `/zh/finance/analytics`. */
  paths: string[];
}

export function isFinancePrecacheMessage(
  data: unknown,
): data is FinancePrecacheMessage {
  if (typeof data !== "object" || data === null) return false;
  if (!("type" in data) || data.type !== FINANCE_PRECACHE_MESSAGE) return false;
  return (
    "paths" in data &&
    Array.isArray(data.paths) &&
    data.paths.every((path) => typeof path === "string")
  );
}
