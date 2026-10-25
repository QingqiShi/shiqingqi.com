/**
 * What a commit of a `NavigationSplitView` does with the snapshot that a
 * navigation of the view read for the URL `to`, where the URL is `here` after
 * the commit:
 *
 * - `"play"`: the motion of the commit starts from the snapshot.
 * - `"drop"`: the snapshot goes. A motion of the commit plays without it.
 * - `"keep"`: the snapshot waits for a later commit.
 *
 * A snapshot is for the next motion only, and only where that motion lands
 * at `to`. Thus a navigation that does not happen, or that another
 * navigation replaces, cannot give its snapshot to an unrelated motion. A
 * commit at `to` with no motion ends the navigation, which moved nothing.
 *
 * @internal
 */
export function pendingSnapshotFate(
  to: string,
  here: string,
  isMotion: boolean,
): "play" | "drop" | "keep" {
  if (isMotion) return here === to ? "play" : "drop";
  return here === to ? "drop" : "keep";
}
