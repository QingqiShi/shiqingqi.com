/** How the discover results are laid out: poster grid or data table. */
export type MediaView = "grid" | "table";

const mediaViews: ReadonlySet<string> = new Set<MediaView>(["grid", "table"]);

export function isMediaView(value: unknown): value is MediaView {
  return typeof value === "string" && mediaViews.has(value);
}
