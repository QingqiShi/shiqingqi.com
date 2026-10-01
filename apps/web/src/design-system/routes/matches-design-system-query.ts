import { DESIGN_SYSTEM_ROUTE_BY_PATH } from "./design-system-route-by-path.ts";
import type { DesignSystemPath } from "./types.ts";

/**
 * Case- and separator-insensitive, so "text field", "textfield" and
 * "text-field" are one query. Chinese needs none of this and is unaffected.
 */
function foldForSearch(value: string) {
  return value.toLowerCase().replaceAll(/[\s\-_/&]+/gu, "");
}

/**
 * Whether a route answers a search. It matches the route's localised name, its
 * URL slug — which keeps the English name searchable in the Chinese locale —
 * and its `keywords`, so a visitor finds Overlay by typing "modal".
 */
export function matchesDesignSystemQuery(
  path: DesignSystemPath,
  label: string,
  query: string,
): boolean {
  const needle = foldForSearch(query);
  if (needle === "") return true;

  const slug = path.slice(path.lastIndexOf("/") + 1);
  const candidates = [
    label,
    slug,
    ...(DESIGN_SYSTEM_ROUTE_BY_PATH.get(path)?.keywords ?? []),
  ];
  return candidates.some((candidate) =>
    foldForSearch(candidate).includes(needle),
  );
}
