import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it } from "vitest";
import { server } from "#src/test-msw.ts";
import {
  createWatchProvidersTool,
  watchProvidersInputSchema,
} from "./watch-providers";

beforeAll(() => {
  process.env.TMDB_API_TOKEN = "test-token";
});

const TMDB_BASE = "https://api.themoviedb.org";

function provider(overrides: {
  provider_id: number;
  provider_name: string;
  display_priority: number;
  logo_path?: string;
}) {
  return {
    logo_path: overrides.logo_path ?? `/logo-${overrides.provider_id}.jpg`,
    provider_id: overrides.provider_id,
    provider_name: overrides.provider_name,
    display_priority: overrides.display_priority,
  };
}

function watchProvidersResponse(id: number, results: Record<string, unknown>) {
  return { id, results };
}

const executeContext = {
  toolCallId: "test",
  messages: [] as never[],
  abortSignal: AbortSignal.timeout(5000),
};

interface RegionResult {
  id: number;
  mediaType: string;
  region: string;
  providers: {
    link: string | null;
    flatrate: Array<{ id: number; name: string; logoPath: string }>;
    rent: Array<{ id: number; name: string; logoPath: string }>;
    buy: Array<{ id: number; name: string; logoPath: string }>;
    ads: Array<{ id: number; name: string; logoPath: string }>;
    free: Array<{ id: number; name: string; logoPath: string }>;
  } | null;
}

interface ProviderSearchResultType {
  id: number;
  mediaType: string;
  providerName: string;
  providerLogoPath: string | null;
  regions: Array<{ country: string; types: string[] }>;
}

/**
 * Helper that calls execute and returns the result as a plain object.
 * The tool's generic return type confuses ESLint's type resolver,
 * so we round-trip through JSON to get a clean object.
 */
async function executeTool(input: {
  id: number;
  media_type: "movie" | "tv";
  region?: string;
  provider_name?: string;
}) {
  const tool = createWatchProvidersTool();
  const result = await tool.execute!(input, executeContext);
  return JSON.parse(JSON.stringify(result)) as
    | RegionResult
    | ProviderSearchResultType;
}

function asRegionResult(result: RegionResult | ProviderSearchResultType) {
  return result as RegionResult;
}

function asSearchResult(result: RegionResult | ProviderSearchResultType) {
  return result as ProviderSearchResultType;
}

describe("watchProvidersInputSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = watchProvidersInputSchema.parse({
      id: 550,
      media_type: "movie",
      region: "US",
    });
    expect(result).toEqual({ id: 550, media_type: "movie", region: "US" });
  });

  it("accepts input without optional region", () => {
    const result = watchProvidersInputSchema.parse({
      id: 1399,
      media_type: "tv",
    });
    expect(result).toEqual({ id: 1399, media_type: "tv" });
  });

  it("rejects invalid media_type", () => {
    expect(() =>
      watchProvidersInputSchema.parse({
        id: 550,
        media_type: "person",
      }),
    ).toThrow();
  });

  it("rejects non-numeric id", () => {
    expect(() =>
      watchProvidersInputSchema.parse({
        id: "abc",
        media_type: "movie",
      }),
    ).toThrow();
  });

  it("rejects region with wrong length", () => {
    expect(() =>
      watchProvidersInputSchema.parse({
        id: 550,
        media_type: "movie",
        region: "USA",
      }),
    ).toThrow();
  });

  it("accepts provider_name", () => {
    const result = watchProvidersInputSchema.parse({
      id: 550,
      media_type: "movie",
      provider_name: "Netflix",
    });
    expect(result).toEqual({
      id: 550,
      media_type: "movie",
      provider_name: "Netflix",
    });
  });
});

describe("createWatchProvidersTool", () => {
  it("returns a tool with description and inputSchema", () => {
    const tool = createWatchProvidersTool();
    expect(tool.description).toBeDefined();
    expect(tool.description).toContain("watch provider");
    expect(tool.inputSchema).toBeDefined();
  });

  it("returns a tool with an execute function", () => {
    const tool = createWatchProvidersTool();
    expect(tool.execute).toBeDefined();
    expect(typeof tool.execute).toBe("function");
  });
});

describe("watch providers execute", () => {
  it("returns providers for a movie region", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/watch/providers`, () =>
        HttpResponse.json(
          watchProvidersResponse(550, {
            US: {
              link: "https://www.themoviedb.org/movie/550/watch?locale=US",
              flatrate: [
                provider({
                  provider_id: 8,
                  provider_name: "Netflix",
                  display_priority: 1,
                }),
              ],
              rent: [
                provider({
                  provider_id: 2,
                  provider_name: "Apple TV",
                  display_priority: 2,
                }),
              ],
              buy: [
                provider({
                  provider_id: 3,
                  provider_name: "Google Play",
                  display_priority: 3,
                }),
              ],
            },
          }),
        ),
      ),
    );

    const result = await executeTool({
      id: 550,
      media_type: "movie",
      region: "US",
    });

    expect(result).toEqual({
      id: 550,
      mediaType: "movie",
      region: "US",
      providers: {
        link: "https://www.themoviedb.org/movie/550/watch?locale=US",
        flatrate: [{ id: 8, name: "Netflix", logoPath: "/logo-8.jpg" }],
        rent: [{ id: 2, name: "Apple TV", logoPath: "/logo-2.jpg" }],
        buy: [{ id: 3, name: "Google Play", logoPath: "/logo-3.jpg" }],
        ads: [],
        free: [],
      },
    });
  });

  it("returns providers for a TV show", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/tv/1399/watch/providers`, () =>
        HttpResponse.json(
          watchProvidersResponse(1399, {
            US: {
              link: "https://www.themoviedb.org/tv/1399/watch?locale=US",
              flatrate: [
                provider({
                  provider_id: 384,
                  provider_name: "HBO Max",
                  display_priority: 1,
                }),
              ],
            },
          }),
        ),
      ),
    );

    const result = await executeTool({
      id: 1399,
      media_type: "tv",
      region: "US",
    });

    expect(result).toEqual({
      id: 1399,
      mediaType: "tv",
      region: "US",
      providers: {
        link: "https://www.themoviedb.org/tv/1399/watch?locale=US",
        flatrate: [{ id: 384, name: "HBO Max", logoPath: "/logo-384.jpg" }],
        rent: [],
        buy: [],
        ads: [],
        free: [],
      },
    });
  });

  it("returns providers: null when region has no data", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/watch/providers`, () =>
        HttpResponse.json(
          watchProvidersResponse(550, {
            US: {
              link: "https://www.themoviedb.org/movie/550/watch?locale=US",
              flatrate: [
                provider({
                  provider_id: 8,
                  provider_name: "Netflix",
                  display_priority: 1,
                }),
              ],
            },
          }),
        ),
      ),
    );

    const result = await executeTool({
      id: 550,
      media_type: "movie",
      region: "JP",
    });

    expect(result).toEqual({
      id: 550,
      mediaType: "movie",
      region: "JP",
      providers: null,
    });
  });

  it("returns providers: null when response has no results", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/999999/watch/providers`, () =>
        HttpResponse.json({ id: 999999 }),
      ),
    );

    const result = await executeTool({
      id: 999999,
      media_type: "movie",
      region: "US",
    });

    expect(result).toEqual({
      id: 999999,
      mediaType: "movie",
      region: "US",
      providers: null,
    });
  });

  it("defaults region to US when not specified", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/watch/providers`, () =>
        HttpResponse.json(
          watchProvidersResponse(550, {
            US: {
              link: "https://www.themoviedb.org/movie/550/watch?locale=US",
              flatrate: [
                provider({
                  provider_id: 8,
                  provider_name: "Netflix",
                  display_priority: 1,
                }),
              ],
            },
          }),
        ),
      ),
    );

    const raw = await executeTool({ id: 550, media_type: "movie" });
    const result = asRegionResult(raw);

    expect(result.region).toBe("US");
    expect(result.providers).not.toBeNull();
    expect(result.providers?.flatrate).toHaveLength(1);
  });

  it("sorts providers by display_priority", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/watch/providers`, () =>
        HttpResponse.json(
          watchProvidersResponse(550, {
            US: {
              link: "https://www.themoviedb.org/movie/550/watch?locale=US",
              flatrate: [
                provider({
                  provider_id: 119,
                  provider_name: "Amazon Prime",
                  display_priority: 10,
                }),
                provider({
                  provider_id: 8,
                  provider_name: "Netflix",
                  display_priority: 1,
                }),
                provider({
                  provider_id: 337,
                  provider_name: "Disney+",
                  display_priority: 5,
                }),
              ],
            },
          }),
        ),
      ),
    );

    const result = asRegionResult(
      await executeTool({ id: 550, media_type: "movie", region: "US" }),
    );

    expect(result.providers).not.toBeNull();
    const names = result.providers!.flatrate.map((p) => p.name);
    expect(names).toEqual(["Netflix", "Disney+", "Amazon Prime"]);
  });

  it("strips unnecessary fields from providers", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/watch/providers`, () =>
        HttpResponse.json(
          watchProvidersResponse(550, {
            US: {
              link: "https://www.themoviedb.org/movie/550/watch?locale=US",
              flatrate: [
                {
                  provider_id: 8,
                  provider_name: "Netflix",
                  logo_path: "/netflix.jpg",
                  display_priority: 1,
                  extra_field: "should be stripped",
                },
              ],
            },
          }),
        ),
      ),
    );

    const result = asRegionResult(
      await executeTool({ id: 550, media_type: "movie", region: "US" }),
    );

    expect(result.providers).not.toBeNull();
    const firstProvider = result.providers!.flatrate[0];
    expect(firstProvider).toBeDefined();
    expect(Object.keys(firstProvider)).toEqual(["id", "name", "logoPath"]);
  });
});

describe("watch providers provider search", () => {
  it("finds provider across multiple regions", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/watch/providers`, () =>
        HttpResponse.json(
          watchProvidersResponse(550, {
            US: {
              link: "https://example.com/US",
              flatrate: [
                provider({
                  provider_id: 8,
                  provider_name: "Netflix",
                  display_priority: 1,
                }),
              ],
            },
            GB: {
              link: "https://example.com/GB",
              rent: [
                provider({
                  provider_id: 8,
                  provider_name: "Netflix",
                  display_priority: 1,
                }),
              ],
            },
            DE: {
              link: "https://example.com/DE",
              flatrate: [
                provider({
                  provider_id: 337,
                  provider_name: "Disney Plus",
                  display_priority: 1,
                }),
              ],
            },
          }),
        ),
      ),
    );

    const result = asSearchResult(
      await executeTool({
        id: 550,
        media_type: "movie",
        provider_name: "Netflix",
      }),
    );

    expect(result.providerName).toBe("Netflix");
    expect(result.providerLogoPath).toBe("/logo-8.jpg");
    expect(result.regions).toHaveLength(2);
    expect(result.regions).toEqual(
      expect.arrayContaining([
        { country: "GB", types: ["rent"] },
        { country: "US", types: ["flatrate"] },
      ]),
    );
  });

  it("returns empty regions when provider not found", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/watch/providers`, () =>
        HttpResponse.json(
          watchProvidersResponse(550, {
            US: {
              link: "https://example.com/US",
              flatrate: [
                provider({
                  provider_id: 337,
                  provider_name: "Disney Plus",
                  display_priority: 1,
                }),
              ],
            },
          }),
        ),
      ),
    );

    const result = asSearchResult(
      await executeTool({
        id: 550,
        media_type: "movie",
        provider_name: "Netflix",
      }),
    );

    expect(result.regions).toEqual([]);
    expect(result.providerLogoPath).toBeNull();
  });

  it("matches provider name case-insensitively", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/watch/providers`, () =>
        HttpResponse.json(
          watchProvidersResponse(550, {
            US: {
              link: "https://example.com/US",
              flatrate: [
                provider({
                  provider_id: 8,
                  provider_name: "Netflix",
                  display_priority: 1,
                }),
              ],
            },
          }),
        ),
      ),
    );

    const result = asSearchResult(
      await executeTool({
        id: 550,
        media_type: "movie",
        provider_name: "netflix",
      }),
    );

    expect(result.regions).toHaveLength(1);
    expect(result.regions[0].country).toBe("US");
  });
});
