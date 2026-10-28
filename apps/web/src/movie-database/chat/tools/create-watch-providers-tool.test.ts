import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it } from "vitest";
import { isRecord } from "#src/movie-database/is-record.ts";
import { server } from "#src/testing/test-msw.ts";
import { createWatchProvidersTool } from "./create-watch-providers-tool";
import { TMDB_BASE, toolExecutionOptions } from "./tool-execution-options";

beforeAll(() => {
  process.env.TMDB_API_TOKEN = "test-token";
});

function provider(overrides: {
  provider_id: number;
  provider_name: string;
  display_priority: number;
  logo_path?: string;
}) {
  return {
    logo_path:
      overrides.logo_path ?? `/logo-${String(overrides.provider_id)}.jpg`,
    provider_id: overrides.provider_id,
    provider_name: overrides.provider_name,
    display_priority: overrides.display_priority,
  };
}

function watchProvidersResponse(id: number, results: Record<string, unknown>) {
  return { id, results };
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
  const result = await tool.execute(input, toolExecutionOptions());
  const parsed: unknown = JSON.parse(JSON.stringify(result));
  return parsed;
}

function isProviderSearchResult(
  value: unknown,
): value is ProviderSearchResultType {
  return isRecord(value) && "providerName" in value;
}

function asSearchResult(result: unknown): ProviderSearchResultType {
  if (!isProviderSearchResult(result)) {
    throw new Error("expected a provider search result");
  }
  return result;
}

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

  it('matches "Disney Plus" against the canonical "Disney+" name', async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/watch/providers`, () =>
        HttpResponse.json(
          watchProvidersResponse(550, {
            US: {
              link: "https://example.com/US",
              flatrate: [
                provider({
                  provider_id: 337,
                  provider_name: "Disney+",
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
        provider_name: "Disney Plus",
      }),
    );

    expect(result.regions).toHaveLength(1);
    expect(result.regions[0].country).toBe("US");
    expect(result.providerLogoPath).toBe("/logo-337.jpg");
  });

  it('matches "Apple TV+" exactly without picking up "Apple TV Channel"', async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/watch/providers`, () =>
        HttpResponse.json(
          watchProvidersResponse(550, {
            US: {
              link: "https://example.com/US",
              flatrate: [
                provider({
                  provider_id: 350,
                  provider_name: "Apple TV+",
                  display_priority: 1,
                }),
              ],
              rent: [
                provider({
                  provider_id: 2,
                  provider_name: "Apple TV Channel",
                  display_priority: 2,
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
        provider_name: "Apple TV+",
      }),
    );

    expect(result.regions).toEqual([{ country: "US", types: ["flatrate"] }]);
    expect(result.providerLogoPath).toBe("/logo-350.jpg");
  });

  it('matches "Prime" against "Amazon Prime Video" via normalised substring', async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/watch/providers`, () =>
        HttpResponse.json(
          watchProvidersResponse(550, {
            US: {
              link: "https://example.com/US",
              flatrate: [
                provider({
                  provider_id: 9,
                  provider_name: "Amazon Prime Video",
                  display_priority: 1,
                }),
                provider({
                  provider_id: 10,
                  provider_name: "Amazon Prime Video with Ads",
                  display_priority: 2,
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
        provider_name: "Prime",
      }),
    );

    expect(result.regions).toHaveLength(1);
    expect(result.regions[0].country).toBe("US");
  });
});
