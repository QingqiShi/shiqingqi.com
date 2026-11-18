import { createHash } from "node:crypto";

export const TRIP_SKILL_NAMES = [
  "reading-bookings",
  "planning-itinerary",
  "pre-departure-check",
  "self-drive-trip",
  "sightseeing-trip",
  "resort-trip",
  "farm-stay-trip",
  "study-visit-trip",
] as const;

export type TripSkillName = (typeof TRIP_SKILL_NAMES)[number];

const DISPLAY_TITLE_PREFIX = "trip-planner/";

export function skillDisplayTitle(name: string) {
  return `${DISPLAY_TITLE_PREFIX}${name}`;
}

export function skillNameOfTitle(displayTitle: string): TripSkillName | null {
  if (!displayTitle.startsWith(DISPLAY_TITLE_PREFIX)) return null;
  const name = displayTitle.slice(DISPLAY_TITLE_PREFIX.length);
  return TRIP_SKILL_NAMES.find((known) => known === name) ?? null;
}

export interface SkillFile {
  /** The path inside the skill's directory, such as `SKILL.md`. */
  path: string;
  text: string;
}

export function contentHash(files: readonly SkillFile[]) {
  const hash = createHash("sha256");
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(`${file.path}\0${file.text}\0`);
  }
  return hash.digest("hex").slice(0, 16);
}

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;
const REVISION = / \(rev ([0-9a-f]{16})\)$/;

export function readFrontmatter(skillMd: string) {
  const block = FRONTMATTER.exec(skillMd)?.[1];
  if (!block) throw new Error("SKILL.md has no frontmatter");
  const field = (key: string) => {
    const value = new RegExp(`^${key}: (.+)$`, "m").exec(block)?.[1]?.trim();
    if (!value) throw new Error(`SKILL.md frontmatter has no ${key}`);
    return value;
  };
  return { name: field("name"), description: field("description") };
}

/**
 * The API keeps no field of our own on a version, and a skill's title cannot
 * change. The description of each version is the one place that holds what we
 * uploaded, so the hash goes at its end.
 */
export function withRevision(skillMd: string, hash: string) {
  return skillMd.replace(
    /^(description: .+)$/m,
    (line) => `${line} (rev ${hash})`,
  );
}

export function revisionOf(description: string) {
  return REVISION.exec(description)?.[1] ?? null;
}

export type SkillAction = "create" | "new version" | "no change";

export function decideAction(
  localHash: string,
  remote: { latestDescription: string } | null,
): SkillAction {
  if (!remote) return "create";
  return revisionOf(remote.latestDescription) === localHash
    ? "no change"
    : "new version";
}

/**
 * The API refuses a second skill with a title in use. If two ever get through,
 * every reader keeps the oldest, so they all agree on one.
 */
export function oldestFirst<T extends { id: string; created_at: string }>(
  skills: readonly T[],
) {
  return [...skills].sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}
