/** The locale-free paths of the five Finance destinations, in order. */
export const FINANCE_DESTINATION_PATHS = [
  "/",
  "/transactions",
  "/analytics",
  "/reports",
  "/settings",
] as const;

/** Whether `current` (a locale-free path) is inside the destination at `path`. */
export function isCurrentDestination(current: string, path: string) {
  if (path === "/") return current === "/";
  return current === path || current.startsWith(`${path}/`);
}
