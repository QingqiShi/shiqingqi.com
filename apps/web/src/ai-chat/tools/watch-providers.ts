import { tool } from "ai";
import { z } from "zod";
import {
  getMovieWatchProviders,
  getTvShowWatchProviders,
} from "#src/_generated/tmdb-server-functions.ts";
import type { ResponseType } from "#src/utils/tmdb-client.ts";
import { isRecord } from "#src/utils/type-guards.ts";
import { toolError } from "./tool-error";

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

type AvailabilityType = "flatrate" | "rent" | "buy" | "ads" | "free";

interface ProviderSearchResult {
  id: number;
  mediaType: "movie" | "tv";
  providerName: string;
  providerLogoPath: string | null;
  regions: Array<{
    country: string;
    types: AvailabilityType[];
  }>;
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

  const match = Object.entries(results).find(([code]) => code === countryCode);
  if (!match) return null;

  const data: unknown = match[1];
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

/**
 * Normalise a provider name for matching: lowercase, treat "+" as "plus",
 * and strip everything else that isn't a letter or digit. So "Disney+",
 * "disney plus", and "DISNEY+" all collapse to "disneyplus".
 */
function normaliseProviderName(name: string): string {
  return name
    .toLowerCase()
    .replaceAll("+", "plus")
    .replace(/[^a-z0-9]/g, "");
}

function findProvider(
  items: unknown,
  name: string,
): { found: boolean; logoPath: string | null } {
  if (!Array.isArray(items)) return { found: false, logoPath: null };
  const target = normaliseProviderName(name);
  if (target === "") return { found: false, logoPath: null };
  for (const item of items) {
    if (
      isRecord(item) &&
      typeof item.provider_name === "string" &&
      normaliseProviderName(item.provider_name).includes(target)
    ) {
      return {
        found: true,
        logoPath: typeof item.logo_path === "string" ? item.logo_path : null,
      };
    }
  }
  return { found: false, logoPath: null };
}

function searchProviderAcrossRegions(
  results: MovieWatchResponse["results"] | TvWatchResponse["results"],
  providerName: string,
): { regions: ProviderSearchResult["regions"]; logoPath: string | null } {
  if (!results) return { regions: [], logoPath: null };

  const regions: ProviderSearchResult["regions"] = [];
  let logoPath: string | null = null;

  for (const [code, rawData] of Object.entries(results)) {
    const data: unknown = rawData;
    if (!isRecord(data)) continue;
    const types: AvailabilityType[] = [];

    for (const availType of AVAILABILITY_TYPES) {
      const match = findProvider(data[availType], providerName);
      if (match.found) {
        types.push(availType);
        if (!logoPath && match.logoPath) {
          logoPath = match.logoPath;
        }
      }
    }

    if (types.length > 0) {
      regions.push({ country: code, types });
    }
  }

  return {
    regions: regions.sort((a, b) => a.country.localeCompare(b.country)),
    logoPath,
  };
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
    execute: async ({ id, media_type, region, provider_name }) => {
      let response;
      try {
        response = await fetchWatchProviders(id, media_type);
      } catch (error) {
        console.error("watch_providers failed", error);
        return toolError(
          "tmdb_unavailable",
          "TMDB watch provider lookup is temporarily unavailable. Tell the user and suggest trying again shortly or falling back to web_search for current streaming availability.",
        );
      }

      if (provider_name) {
        const { regions, logoPath } = searchProviderAcrossRegions(
          response.results,
          provider_name,
        );
        return {
          id,
          mediaType: media_type,
          providerName: provider_name,
          providerLogoPath: logoPath,
          regions,
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
