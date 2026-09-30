import { isRecord } from "#src/utils/is-record.ts";
import type { PersonListItem } from "#src/utils/types.ts";

function extractPersonEntries(arr: unknown): PersonListItem[] {
  if (!Array.isArray(arr)) return [];

  const items: PersonListItem[] = [];
  for (const entry of arr) {
    if (!isRecord(entry)) continue;
    if (typeof entry.id !== "number") continue;

    items.push({
      id: entry.id,
      name: typeof entry.name === "string" ? entry.name : null,
      profilePath:
        typeof entry.profile_path === "string" ? entry.profile_path : null,
      knownForDepartment:
        typeof entry.known_for_department === "string"
          ? entry.known_for_department
          : null,
    });
  }
  return items;
}

function mapTmdbSearchPersonOutput(
  output: unknown,
): ReadonlyArray<PersonListItem> {
  if (!Array.isArray(output)) return [];
  return extractPersonEntries(
    output.filter((entry) => isRecord(entry) && entry.media_type === "person"),
  );
}

function mapMediaCreditsPersonOutput(
  output: unknown,
): ReadonlyArray<PersonListItem> {
  if (!isRecord(output)) return [];

  const castItems = extractPersonEntries(output.cast);
  const crewItems = extractPersonEntries(output.crew);
  const seen = new Set<number>();
  const items: PersonListItem[] = [];

  for (const item of [...castItems, ...crewItems]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  return items;
}

export function buildPersonResultsMap(
  toolName: string,
  output: unknown,
): ReadonlyMap<number, PersonListItem> {
  let items: ReadonlyArray<PersonListItem>;
  switch (toolName) {
    case "tmdb_search":
      items = mapTmdbSearchPersonOutput(output);
      break;
    case "media_credits":
      items = mapMediaCreditsPersonOutput(output);
      break;
    default:
      return new Map();
  }
  return new Map(items.map((item) => [item.id, item]));
}
