import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import {
  parseWatchProviderOutput,
  ToolWatchProviders,
} from "./tool-watch-providers";

function makeProviderData(
  overrides: Partial<Parameters<typeof ToolWatchProviders>[0]["data"]> = {},
) {
  return {
    id: 550,
    mediaType: "movie" as const,
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

describe("ToolWatchProviders", () => {
  it("renders provider logos grouped by category", () => {
    render(<ToolWatchProviders data={makeProviderData()} />);

    expect(screen.getByText("Stream")).toBeInTheDocument();
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Buy")).toBeInTheDocument();

    expect(screen.getByAltText("Netflix")).toBeInTheDocument();
    expect(screen.getByAltText("Disney+")).toBeInTheDocument();
    expect(screen.getByAltText("Apple TV")).toBeInTheDocument();
    expect(screen.getByAltText("Google Play")).toBeInTheDocument();
  });

  it("omits empty categories", () => {
    const data = makeProviderData({
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
    const data = makeProviderData({ providers: null });
    render(<ToolWatchProviders data={data} />);

    expect(screen.getByText("Not available in US")).toBeInTheDocument();
  });

  it("shows JustWatch attribution text", () => {
    render(<ToolWatchProviders data={makeProviderData()} />);

    expect(screen.getByText("Data provided by JustWatch")).toBeInTheDocument();
  });

  it("shows region in header", () => {
    render(<ToolWatchProviders data={makeProviderData({ region: "GB" })} />);

    expect(screen.getByText("GB")).toBeInTheDocument();
    expect(screen.getByText("Where to Watch")).toBeInTheDocument();
  });

  it("renders JustWatch as a link when link is available", () => {
    render(<ToolWatchProviders data={makeProviderData()} />);

    const link = screen.getByText("Data provided by JustWatch");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute(
      "href",
      "https://www.themoviedb.org/movie/550/watch?locale=US",
    );
  });

  it("renders JustWatch as plain text when link is null", () => {
    const data = makeProviderData({ providers: null });
    render(<ToolWatchProviders data={data} />);

    const text = screen.getByText("Data provided by JustWatch");
    expect(text.tagName).toBe("SPAN");
  });
});

describe("parseWatchProviderOutput", () => {
  it("parses valid output", () => {
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
    expect(result?.id).toBe(550);
    expect(result?.providers?.flatrate).toHaveLength(1);
  });

  it("returns null for invalid output", () => {
    expect(parseWatchProviderOutput(null)).toBeNull();
    expect(parseWatchProviderOutput(undefined)).toBeNull();
    expect(parseWatchProviderOutput("string")).toBeNull();
    expect(parseWatchProviderOutput({ id: "not-a-number" })).toBeNull();
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
    expect(result?.providers).toBeNull();
  });

  it("rejects invalid media_type", () => {
    const output = {
      id: 550,
      mediaType: "person",
      region: "US",
      providers: null,
    };
    expect(parseWatchProviderOutput(output)).toBeNull();
  });
});
