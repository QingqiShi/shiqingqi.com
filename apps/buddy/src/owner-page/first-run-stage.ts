export type FirstRunStage = "waiting-mac" | "waiting-data";

/**
 * Where the owner is before the first upload: no Mac yet, or a Mac that has not uploaded. Null
 * once the first upload landed, whether or not a Mac is still connected: the pet then lives on
 * the page.
 */
export function firstRunStage(
  connectedMacs: number,
  updatedAt: number | null,
): FirstRunStage | null {
  if (updatedAt !== null) return null;

  return connectedMacs > 0 ? "waiting-data" : "waiting-mac";
}
