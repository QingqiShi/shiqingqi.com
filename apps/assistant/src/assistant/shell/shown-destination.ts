export type DestinationPath = "/" | "/todos" | "/activity" | "/settings";

function isInside(current: string, path: string) {
  return current === path || current.startsWith(`${path}/`);
}

/** The destination whose screen shows at `current`, a locale-free path. */
export function shownDestination(current: string): DestinationPath | null {
  if (current === "/" || isInside(current, "/reports")) return "/";
  if (isInside(current, "/todos")) return "/todos";
  if (isInside(current, "/activity")) return "/activity";
  if (isInside(current, "/settings") || isInside(current, "/report-preview")) {
    return "/settings";
  }
  return null;
}
