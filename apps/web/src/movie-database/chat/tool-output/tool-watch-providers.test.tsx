import { describe, expect, it } from "vitest";
import { render, screen } from "#src/testing/test-utils.tsx";
import type { WatchProviderOutput } from "./tool-watch-providers";
import {
  parseWatchProviderOutput,
  ToolWatchProviders,
} from "./tool-watch-providers";

function makeRegionProviderData(
  overrides: Partial<
    Omit<Extract<WatchProviderOutput, { type: "region" }>, "type">
  > = {},
): Extract<WatchProviderOutput, { type: "region" }> {
  return {
    type: "region",
    id: 550,
    mediaType: "movie",
    region: "US",
    providers: {
      link: "https://www.themoviedb.org/movie/550/watch?locale=US",
      flatrate: [
        { id: 8, name: "Netflix", logoPath: "/netflix.jpg" },
        { id: 337, name: "Disney+", logoPath: "/disney.jpg" },
      ],
      rent: [{ id: 2, name: "Apple TV", logoPath: "/apple.jpg" }],
      buy: [{ id: 3, name: "Google Play", logoPath: "/google.jpg" }],
      ads: [],
      free: [],
    },
    ...overrides,
  };
}

function makeProviderSearchData(
  overrides: Partial<
    Omit<Extract<WatchProviderOutput, { type: "providerSearch" }>, "type">
  > = {},
): Extract<WatchProviderOutput, { type: "providerSearch" }> {
  return {
    type: "providerSearch",
    id: 550,
    mediaType: "movie",
    providerName: "Netflix",
    providerLogoPath: "/netflix.jpg",
    regions: [
      { country: "US", types: ["flatrate"] },
      { country: "GB", types: ["flatrate", "ads"] },
    ],
    ...overrides,
  };
}

describe("ToolWatchProviders", () => {
  it("shows JustWatch attribution text", () => {
    render(<ToolWatchProviders data={makeRegionProviderData()} />);

    expect(screen.getByText("Data provided by JustWatch")).toBeInTheDocument();
  });
});

describe("parseWatchProviderOutput", () => {
  describe("region variant", () => {
    it("parses valid region output", () => {
      const output = {
        id: 550,
        mediaType: "movie",
        region: "US",
        providers: {
          link: "https://example.com",
          flatrate: [{ id: 8, name: "Netflix", logoPath: "/netflix.jpg" }],
          rent: [],
          buy: [],
          ads: [],
          free: [],
        },
      };
      const result = parseWatchProviderOutput(output);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("region");
      expect(result?.id).toBe(550);
      if (result?.type === "region") {
        expect(result.providers?.flatrate).toHaveLength(1);
      }
    });
  });

  describe("provider search variant", () => {
    it("parses valid provider search output", () => {
      const output = {
        id: 550,
        mediaType: "movie",
        providerName: "Netflix",
        providerLogoPath: "/netflix.jpg",
        regions: [
          { country: "US", types: ["flatrate"] },
          { country: "GB", types: ["flatrate", "ads"] },
        ],
      };
      const result = parseWatchProviderOutput(output);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("providerSearch");
      if (result?.type === "providerSearch") {
        expect(result.providerName).toBe("Netflix");
        expect(result.providerLogoPath).toBe("/netflix.jpg");
        expect(result.regions).toHaveLength(2);
        expect(result.regions[0].country).toBe("US");
        expect(result.regions[0].types).toEqual(["flatrate"]);
        expect(result.regions[1].country).toBe("GB");
        expect(result.regions[1].types).toEqual(["flatrate", "ads"]);
      }
    });

    it("filters out invalid availability types", () => {
      const output = {
        id: 550,
        mediaType: "movie",
        providerName: "Netflix",
        regions: [
          { country: "US", types: ["flatrate", "invalid_type", "rent"] },
        ],
      };
      const result = parseWatchProviderOutput(output);
      expect(result?.type).toBe("providerSearch");
      if (result?.type === "providerSearch") {
        expect(result.regions[0].types).toEqual(["flatrate", "rent"]);
      }
    });
  });

  describe("common validation", () => {
    it("rejects invalid mediaType", () => {
      const output = {
        id: 550,
        mediaType: "person",
        region: "US",
        providers: null,
      };
      expect(parseWatchProviderOutput(output)).toBeNull();
    });
  });
});

describe("ToolWatchProviders - provider search", () => {
  it("shows JustWatch attribution text", () => {
    render(<ToolWatchProviders data={makeProviderSearchData()} />);

    expect(screen.getByText("Data provided by JustWatch")).toBeInTheDocument();
  });
});
