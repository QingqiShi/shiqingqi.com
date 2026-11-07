import simplifyTrackers from "./simplify-trackers.json";

const ATOM = String.raw`(?:\[[^\]]*\]|\\.|(?<!\\)\.)`;
const LEADING_REPEAT = new RegExp(`^(${ATOM})[+*]`);
const OPEN_COUNT = /\{(\d+),\}/g;
const REPEAT = new RegExp(`(${ATOM})([+*])`, "g");
/** A host name has at most 253 characters, and no mail needs more between two parts of a tracker URL. */
const REPEAT_LIMIT = "253";

/**
 * Makes a pattern of the list linear in the length of the URL. A pattern
 * matches anywhere in the URL, so a repeat at its start only asks for one
 * (or no) character before the rest, and the repeat is not needed. Other
 * open repeats (`+`, `*` and `{n,}`) get a limit: without one, a crafted URL with many starts
 * for the same pattern makes the matching quadratic.
 */
export function limitPattern(pattern: string): string {
  const leading = LEADING_REPEAT.exec(pattern);
  const rest = leading
    ? `${leading[0].endsWith("+") ? leading[1] : ""}${pattern.slice(leading[0].length)}`
    : pattern;
  return rest
    .replace(
      REPEAT,
      (_, atom: string, repeat: string) =>
        `${atom}{${repeat === "+" ? "1" : "0"},${REPEAT_LIMIT}}`,
    )
    .replace(OPEN_COUNT, `{$1,${REPEAT_LIMIT}}`);
}

/** The open-tracking pixels of mail senders, from Simplify's list (see `simplify-trackers.json` for its source and licence). */
const TRACKER_PATTERN = new RegExp(
  Object.values(simplifyTrackers.patterns).flat().map(limitPattern).join("|"),
  "i",
);

/** True when the URL is a known open-tracking pixel. */
export function isTrackerUrl(url: string): boolean {
  return TRACKER_PATTERN.test(url);
}
