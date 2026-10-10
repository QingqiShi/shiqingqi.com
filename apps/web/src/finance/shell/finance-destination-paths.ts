/** The locale-free paths of the five Finance destinations, in order. */
export const FINANCE_DESTINATION_PATHS = [
  "/finance",
  "/finance/transactions",
  "/finance/analytics",
  "/finance/reports",
  "/finance/settings",
] as const;

/** Whether `current` (a locale-free path) is inside the destination at `path`. */
export function isCurrentDestination(current: string, path: string) {
  if (path === "/finance") {
    return current === "/finance" || current.startsWith("/finance/accounts");
  }
  return current === path || current.startsWith(`${path}/`);
}
