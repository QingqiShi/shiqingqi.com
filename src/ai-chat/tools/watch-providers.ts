import { tool } from "ai";
import { z } from "zod";
import {
  getMovieWatchProviders,
  getTvShowWatchProviders,
} from "#src/_generated/tmdb-server-functions.ts";
import type { ResponseType } from "#src/utils/tmdb-client.ts";

export const watchProvidersInputSchema = z.object({
  id: z.number().describe("The TMDB ID of the movie or TV show."),
  media_type: z.enum(["movie", "tv"]).describe('Either "movie" or "tv".'),
  region: z
    .string()
    .length(2)
    .optional()
    .describe(
      "ISO 3166-1 country code (2 letters, e.g. US, GB, DE). " +
        "Infer from user locale or mentioned country. Defaults to US. " +
        "Ignored when provider_name is set.",
    ),
  provider_name: z
    .string()
    .optional()
    .describe(
      'When set, searches ALL regions for this provider (e.g. "Netflix", "Disney Plus") ' +
        "and returns which countries carry it. Use for questions like " +
        '"Is X on Netflix?", "Which countries have X on Disney+?".',
    ),
});

const TOOL_DESCRIPTION =
  "Get watch provider (streaming/rent/buy) availability for a movie or TV show. " +
  "Use this when the user asks where to watch something, whether it's on a specific platform, " +
  "or about streaming availability. Infer the region from the user's locale. " +
  "Set provider_name to search across all regions for a specific platform.";

type MovieWatchResponse = ResponseType<
  "/3/movie/{movie_id}/watch/providers",
  "get"
>;
type TvWatchResponse = ResponseType<"/3/tv/{series_id}/watch/providers", "get">;

interface ProviderEntry {
  id: number;
  name: string;
  logoPath: string;
}

interface RegionProviders {
  link: string | null;
  flatrate: ProviderEntry[];
  rent: ProviderEntry[];
  buy: ProviderEntry[];
  ads: ProviderEntry[];
  free: ProviderEntry[];
}

interface WatchProvidersResult {
  id: number;
  mediaType: "movie" | "tv";
  region: string;
  providers: RegionProviders | null;
}

type AvailabilityType = "flatrate" | "rent" | "buy" | "ads" | "free";

interface ProviderSearchResult {
  id: number;
  mediaType: "movie" | "tv";
  providerName: string;
  regions: Array<{
    country: string;
    types: AvailabilityType[];
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapProviders(items: unknown): ProviderEntry[] {
  if (!Array.isArray(items)) return [];
  const entries: Array<{ entry: ProviderEntry; priority: number }> = [];
  for (const raw of items) {
    if (!isRecord(raw)) continue;
    if (typeof raw.provider_id !== "number") continue;
    if (typeof raw.display_priority !== "number") continue;
    entries.push({
      entry: {
        id: raw.provider_id,
        name: typeof raw.provider_name === "string" ? raw.provider_name : "",
        logoPath: typeof raw.logo_path === "string" ? raw.logo_path : "",
      },
      priority: raw.display_priority,
    });
  }
  return entries.sort((a, b) => a.priority - b.priority).map((e) => e.entry);
}

function extractRegionData(
  results: MovieWatchResponse["results"] | TvWatchResponse["results"],
  countryCode: string,
): RegionProviders | null {
  if (!results) return null;

  // Direct O(1) property lookup instead of O(n) Object.entries().find().
  // Widen to `unknown` first so isRecord narrows to Record<string, unknown>,
  // enabling dynamic key access without type assertions.
  const resultsRecord: unknown = results;
  if (!isRecord(resultsRecord)) return null;

  const data: unknown = resultsRecord[countryCode];
  if (!isRecord(data)) return null;

  return {
    link: typeof data.link === "string" ? data.link : null,
    flatrate: mapProviders(data.flatrate),
    rent: mapProviders(data.rent),
    buy: mapProviders(data.buy),
    ads: mapProviders(data.ads),
    free: mapProviders(data.free),
  };
}

const AVAILABILITY_TYPES: AvailabilityType[] = [
  "flatrate",
  "rent",
  "buy",
  "ads",
  "free",
];

function hasProviderName(items: unknown, name: string): boolean {
  if (!Array.isArray(items)) return false;
  const lower = name.toLowerCase();
  return items.some(
    (item) =>
      isRecord(item) &&
      typeof item.provider_name === "string" &&
      item.provider_name.toLowerCase().includes(lower),
  );
}

function searchProviderAcrossRegions(
  results: MovieWatchResponse["results"] | TvWatchResponse["results"],
  providerName: string,
): ProviderSearchResult["regions"] {
  if (!results) return [];

  const regions: ProviderSearchResult["regions"] = [];

  for (const [code, rawData] of Object.entries(results)) {
    const data: unknown = rawData;
    if (!isRecord(data)) continue;
    const types: AvailabilityType[] = [];

    for (const availType of AVAILABILITY_TYPES) {
      if (hasProviderName(data[availType], providerName)) {
        types.push(availType);
      }
    }

    if (types.length > 0) {
      regions.push({ country: code, types });
    }
  }

  return regions.sort((a, b) => a.country.localeCompare(b.country));
}

async function fetchWatchProviders(id: number, mediaType: "movie" | "tv") {
  return mediaType === "movie"
    ? getMovieWatchProviders({ movie_id: String(id) })
    : getTvShowWatchProviders({ series_id: String(id) });
}

export function createWatchProvidersTool() {
  return tool({
    description: TOOL_DESCRIPTION,
    inputSchema: watchProvidersInputSchema,
    execute: async ({
      id,
      media_type,
      region,
      provider_name,
    }): Promise<WatchProvidersResult | ProviderSearchResult> => {
      const response = await fetchWatchProviders(id, media_type);

      if (provider_name) {
        return {
          id,
          mediaType: media_type,
          providerName: provider_name,
          regions: searchProviderAcrossRegions(response.results, provider_name),
        };
      }

      const countryCode = region?.toUpperCase() ?? "US";
      return {
        id,
        mediaType: media_type,
        region: countryCode,
        providers: extractRegionData(response.results, countryCode),
      };
    },
  });
}
