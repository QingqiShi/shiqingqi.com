import { describe, expect, it } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
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
  it("renders provider logos grouped by category", () => {
    render(<ToolWatchProviders data={makeRegionProviderData()} />);

    expect(screen.getByText("Stream")).toBeInTheDocument();
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Buy")).toBeInTheDocument();

    expect(screen.getByAltText("Netflix")).toBeInTheDocument();
    expect(screen.getByAltText("Disney+")).toBeInTheDocument();
    expect(screen.getByAltText("Apple TV")).toBeInTheDocument();
    expect(screen.getByAltText("Google Play")).toBeInTheDocument();
  });

  it("omits empty categories", () => {
    const data = makeRegionProviderData({
      providers: {
        link: null,
        flatrate: [{ id: 8, name: "Netflix", logoPath: "/netflix.jpg" }],
        rent: [],
        buy: [],
        ads: [],
        free: [],
      },
    });
    render(<ToolWatchProviders data={data} />);

    expect(screen.getByText("Stream")).toBeInTheDocument();
    expect(screen.queryByText("Rent")).not.toBeInTheDocument();
    expect(screen.queryByText("Buy")).not.toBeInTheDocument();
    expect(screen.queryByText("Ads")).not.toBeInTheDocument();
    expect(screen.queryByText("Free")).not.toBeInTheDocument();
  });

  it("shows 'Not available' when providers is null", () => {
    const data = makeRegionProviderData({ providers: null });
    render(<ToolWatchProviders data={data} />);

    expect(
      screen.getByText("Not available in United States"),
    ).toBeInTheDocument();
  });

  it("shows JustWatch attribution text", () => {
    render(<ToolWatchProviders data={makeRegionProviderData()} />);

    expect(screen.getByText("Data provided by JustWatch")).toBeInTheDocument();
  });

  it("shows region in header", () => {
    render(
      <ToolWatchProviders data={makeRegionProviderData({ region: "GB" })} />,
    );

    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    expect(screen.getByText("Where to Watch")).toBeInTheDocument();
  });

  it("renders JustWatch as a link when link is available", () => {
    render(<ToolWatchProviders data={makeRegionProviderData()} />);

    const link = screen.getByText("Data provided by JustWatch");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute(
      "href",
      "https://www.themoviedb.org/movie/550/watch?locale=US",
    );
  });

  it("renders JustWatch as plain text when link is null", () => {
    const data = makeRegionProviderData({ providers: null });
    render(<ToolWatchProviders data={data} />);

    const text = screen.getByText("Data provided by JustWatch");
    expect(text.tagName).toBe("SPAN");
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

    it("handles providers: null", () => {
      const output = {
        id: 550,
        mediaType: "movie",
        region: "US",
        providers: null,
      };
      const result = parseWatchProviderOutput(output);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("region");
      if (result?.type === "region") {
        expect(result.providers).toBeNull();
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

    it("parses providerLogoPath as null when missing", () => {
      const output = {
        id: 550,
        mediaType: "movie",
        providerName: "Netflix",
        regions: [],
      };
      const result = parseWatchProviderOutput(output);
      if (result?.type === "providerSearch") {
        expect(result.providerLogoPath).toBeNull();
      }
    });

    it("handles empty regions array", () => {
      const output = {
        id: 550,
        mediaType: "movie",
        providerName: "Netflix",
        regions: [],
      };
      const result = parseWatchProviderOutput(output);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("providerSearch");
      if (result?.type === "providerSearch") {
        expect(result.regions).toHaveLength(0);
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

    it("skips regions with no valid types", () => {
      const output = {
        id: 550,
        mediaType: "movie",
        providerName: "Netflix",
        regions: [
          { country: "US", types: ["invalid_only"] },
          { country: "GB", types: ["flatrate"] },
        ],
      };
      const result = parseWatchProviderOutput(output);
      if (result?.type === "providerSearch") {
        expect(result.regions).toHaveLength(1);
        expect(result.regions[0].country).toBe("GB");
      }
    });

    it("returns null when providerName is not a string", () => {
      const output = {
        id: 550,
        mediaType: "movie",
        providerName: 123,
        regions: [],
      };
      expect(parseWatchProviderOutput(output)).toBeNull();
    });

    it("returns null when regions is not an array", () => {
      const output = {
        id: 550,
        mediaType: "movie",
        providerName: "Netflix",
        regions: "invalid",
      };
      expect(parseWatchProviderOutput(output)).toBeNull();
    });
  });

  describe("common validation", () => {
    it("returns null for invalid output", () => {
      expect(parseWatchProviderOutput(null)).toBeNull();
      expect(parseWatchProviderOutput(undefined)).toBeNull();
      expect(parseWatchProviderOutput("string")).toBeNull();
      expect(parseWatchProviderOutput({ id: "not-a-number" })).toBeNull();
    });

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
  it("renders provider name and region count", () => {
    render(<ToolWatchProviders data={makeProviderSearchData()} />);

    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("2 regions")).toBeInTheDocument();
  });

  it("renders singular region count for one region", () => {
    render(
      <ToolWatchProviders
        data={makeProviderSearchData({
          regions: [{ country: "US", types: ["flatrate"] }],
        })}
      />,
    );

    expect(screen.getByText("1 region")).toBeInTheDocument();
  });

  it("renders full country names grouped by availability type", () => {
    render(<ToolWatchProviders data={makeProviderSearchData()} />);

    expect(screen.getByText("United States")).toBeInTheDocument();
    // GB appears in both Stream and Ads groups
    expect(screen.getAllByText("United Kingdom")).toHaveLength(2);
    expect(screen.getByText("Stream")).toBeInTheDocument();
    expect(screen.getByText("Ads")).toBeInTheDocument();
  });

  it("truncates long country lists and shows expand button", () => {
    const manyRegions = [
      "US",
      "GB",
      "DE",
      "FR",
      "IT",
      "ES",
      "CA",
      "AU",
      "JP",
      "BR",
      "MX",
      "IN",
    ].map((code) => ({ country: code, types: ["flatrate" as const] }));

    render(
      <ToolWatchProviders
        data={makeProviderSearchData({ regions: manyRegions })}
      />,
    );

    // First 8 should be visible
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("Australia")).toBeInTheDocument();

    // Items beyond 8 should be hidden
    expect(screen.queryByText("Japan")).not.toBeInTheDocument();
    expect(screen.queryByText("Brazil")).not.toBeInTheDocument();

    // Show more button
    expect(screen.getByText("+4 more")).toBeInTheDocument();
  });

  it("expands country list when clicking show more", async () => {
    const user = userEvent.setup();
    const manyRegions = [
      "US",
      "GB",
      "DE",
      "FR",
      "IT",
      "ES",
      "CA",
      "AU",
      "JP",
      "BR",
    ].map((code) => ({ country: code, types: ["flatrate" as const] }));

    render(
      <ToolWatchProviders
        data={makeProviderSearchData({ regions: manyRegions })}
      />,
    );

    expect(screen.queryByText("Japan")).not.toBeInTheDocument();

    await user.click(screen.getByText("+2 more"));

    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(screen.getByText("Brazil")).toBeInTheDocument();
    expect(screen.queryByText("+2 more")).not.toBeInTheDocument();
  });

  it("shows not available message when regions is empty", () => {
    render(
      <ToolWatchProviders data={makeProviderSearchData({ regions: [] })} />,
    );

    expect(
      screen.getByText("Not available on Netflix in any region"),
    ).toBeInTheDocument();
  });

  it("shows JustWatch attribution text", () => {
    render(<ToolWatchProviders data={makeProviderSearchData()} />);

    expect(screen.getByText("Data provided by JustWatch")).toBeInTheDocument();
  });
});
