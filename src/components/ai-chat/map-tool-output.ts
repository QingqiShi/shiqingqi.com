import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { presentMediaInputSchema } from "#src/ai-chat/tools/present-media.ts";
import { presentPersonInputSchema } from "#src/ai-chat/tools/present-person.ts";
import { presentProviderRegionsInputSchema } from "#src/ai-chat/tools/present-provider-regions.ts";
import { presentWatchProvidersInputSchema } from "#src/ai-chat/tools/present-watch-providers.ts";
import { isRecord } from "#src/utils/type-guards.ts";
import type { MediaListItem, PersonListItem } from "#src/utils/types.ts";
import type { WatchProviderOutput } from "./tool-watch-providers";
import { parseWatchProviderOutput } from "./tool-watch-providers";

export interface ToolOutputMaps {
  searchResultsMap: ReadonlyMap<string, MediaListItem>;
  personResultsMap: ReadonlyMap<number, PersonListItem>;
  watchProvidersMap: ReadonlyMap<string, WatchProviderOutput>;
}

export const EMPTY_TOOL_OUTPUTS: ToolOutputMaps = {
  searchResultsMap: new Map(),
  personResultsMap: new Map(),
  watchProvidersMap: new Map(),
};

export function accumulateToolOutputs(
  messages: ReadonlyArray<UIMessage>,
): ToolOutputMaps {
  const searchResultsMap = new Map<string, MediaListItem>();
  const personResultsMap = new Map<number, PersonListItem>();
  const watchProvidersMap = new Map<string, WatchProviderOutput>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (!isToolUIPart(part)) continue;
      if (part.state !== "output-available" || !("output" in part)) continue;

      const name = getToolName(part);

      for (const [k, v] of buildSearchResultsMap(name, part.output)) {
        searchResultsMap.set(k, v);
      }
      for (const [k, v] of buildPersonResultsMap(name, part.output)) {
        personResultsMap.set(k, v);
      }
      if (name === "watch_providers") {
        for (const [k, v] of buildWatchProvidersMap(part.output)) {
          watchProvidersMap.set(k, v);
        }
      }
    }
  }

  return { searchResultsMap, personResultsMap, watchProvidersMap };
}

function mapTmdbSearchOutput(output: unknown): ReadonlyArray<MediaListItem> {
  if (!Array.isArray(output)) return [];

  const items: MediaListItem[] = [];

  for (const entry of output) {
    if (!isRecord(entry)) continue;
    if (typeof entry.id !== "number") continue;
    // Person results have no detail pages
    if (entry.media_type === "person") continue;

    items.push({
      id: entry.id,
      title:
        typeof entry.title === "string"
          ? entry.title
          : typeof entry.name === "string"
            ? entry.name
            : undefined,
      posterPath:
        typeof entry.poster_path === "string" ? entry.poster_path : null,
      rating:
        typeof entry.vote_average === "number" ? entry.vote_average : null,
      mediaType:
        entry.media_type === "movie" || entry.media_type === "tv"
          ? entry.media_type
          : null,
    });
  }

  return items;
}

function mapSemanticSearchOutput(
  output: unknown,
): ReadonlyArray<MediaListItem> {
  if (!Array.isArray(output)) return [];

  const items: MediaListItem[] = [];

  for (const entry of output) {
    if (!isRecord(entry)) continue;
    if (typeof entry.tmdbId !== "number") continue;

    items.push({
      id: entry.tmdbId,
      title: typeof entry.title === "string" ? entry.title : undefined,
      posterPath:
        typeof entry.posterPath === "string" ? entry.posterPath : null,
      rating: typeof entry.voteAverage === "number" ? entry.voteAverage : null,
      mediaType:
        entry.mediaType === "movie" || entry.mediaType === "tv"
          ? entry.mediaType
          : null,
    });
  }

  return items;
}

function mapPersonCreditsOutput(output: unknown): ReadonlyArray<MediaListItem> {
  if (!Array.isArray(output)) return [];

  const items: MediaListItem[] = [];
  for (const entry of output) {
    if (!isRecord(entry)) continue;
    if (typeof entry.id !== "number") continue;

    items.push({
      id: entry.id,
      title: typeof entry.title === "string" ? entry.title : undefined,
      posterPath:
        typeof entry.poster_path === "string" ? entry.poster_path : null,
      rating:
        typeof entry.vote_average === "number" ? entry.vote_average : null,
      mediaType:
        entry.media_type === "movie" || entry.media_type === "tv"
          ? entry.media_type
          : null,
    });
  }
  return items;
}

export function mapToolOutputToMediaItems(
  toolName: string,
  output: unknown,
): ReadonlyArray<MediaListItem> {
  switch (toolName) {
    case "tmdb_search":
      return mapTmdbSearchOutput(output);
    case "semantic_search":
      return mapSemanticSearchOutput(output);
    case "person_credits":
      return mapPersonCreditsOutput(output);
    default:
      return [];
  }
}

export function buildSearchResultsMap(
  toolName: string,
  output: unknown,
): ReadonlyMap<string, MediaListItem> {
  const items = mapToolOutputToMediaItems(toolName, output);
  const map = new Map<string, MediaListItem>();
  for (const item of items) {
    if (item.mediaType) {
      map.set(`${item.mediaType}:${item.id}`, item);
    }
  }
  return map;
}

export function resolveMediaItems(
  input: unknown,
  searchResults: ReadonlyMap<string, MediaListItem>,
): ReadonlyArray<MediaListItem> {
  const parsed = presentMediaInputSchema.safeParse(input);
  if (!parsed.success) return [];

  const items: MediaListItem[] = [];
  for (const entry of parsed.data.media) {
    const key = `${entry.media_type}:${entry.id}`;
    const found = searchResults.get(key);
    if (found) {
      items.push(found);
    } else {
      items.push({
        id: entry.id,
        mediaType: entry.media_type,
      });
    }
  }
  return items;
}

function mapTmdbSearchPersonOutput(
  output: unknown,
): ReadonlyArray<PersonListItem> {
  if (!Array.isArray(output)) return [];

  const items: PersonListItem[] = [];
  for (const entry of output) {
    if (!isRecord(entry)) continue;
    if (typeof entry.id !== "number") continue;
    if (entry.media_type !== "person") continue;

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

function mapMediaCreditsPersonOutput(
  output: unknown,
): ReadonlyArray<PersonListItem> {
  // New format: { cast: [...], crew: [...] }
  if (isRecord(output)) {
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

  // Legacy format: flat array (backwards-compatible with cached data)
  return extractPersonEntries(output);
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

export function resolvePersonItems(
  input: unknown,
  personResults: ReadonlyMap<number, PersonListItem>,
): ReadonlyArray<PersonListItem> {
  const parsed = presentPersonInputSchema.safeParse(input);
  if (!parsed.success) return [];

  const items: PersonListItem[] = [];
  for (const entry of parsed.data.people) {
    const found = personResults.get(entry.id);
    if (found) {
      items.push(found);
    } else {
      items.push({ id: entry.id });
    }
  }
  return items;
}

function watchProvidersKey(data: WatchProviderOutput): string {
  if (data.type === "region") {
    return `wp:region:${data.id}:${data.mediaType}:${data.region}`;
  }
  return `wp:provider:${data.id}:${data.mediaType}:${data.providerName.toLowerCase()}`;
}

export function buildWatchProvidersMap(
  output: unknown,
): ReadonlyMap<string, WatchProviderOutput> {
  const map = new Map<string, WatchProviderOutput>();
  const parsed = parseWatchProviderOutput(output);
  if (parsed) {
    map.set(watchProvidersKey(parsed), parsed);
  }
  return map;
}

export function resolveWatchProviders(
  input: unknown,
  watchProviders: ReadonlyMap<string, WatchProviderOutput>,
): WatchProviderOutput | null {
  const parsed = presentWatchProvidersInputSchema.safeParse(input);
  if (!parsed.success) return null;
  const key = `wp:region:${parsed.data.id}:${parsed.data.media_type}:${parsed.data.region.toUpperCase()}`;
  return watchProviders.get(key) ?? null;
}

export function resolveProviderRegions(
  input: unknown,
  watchProviders: ReadonlyMap<string, WatchProviderOutput>,
): WatchProviderOutput | null {
  const parsed = presentProviderRegionsInputSchema.safeParse(input);
  if (!parsed.success) return null;
  const key = `wp:provider:${parsed.data.id}:${parsed.data.media_type}:${parsed.data.provider_name.toLowerCase()}`;
  return watchProviders.get(key) ?? null;
}
