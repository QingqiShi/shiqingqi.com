import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import type { MediaListItem } from "#src/utils/types.ts";
import { MediaDetailProvider } from "./media-detail-context";
import { ToolVisualOutput } from "./tool-visual-output";

const searchResultsMap = new Map<string, MediaListItem>([
  [
    "movie:1",
    {
      id: 1,
      title: "Inception",
      posterPath: "/inception.jpg",
      rating: 8.4,
      mediaType: "movie",
    },
  ],
  [
    "tv:100",
    {
      id: 100,
      title: "Dark",
      posterPath: "/dark.jpg",
      rating: 8.8,
      mediaType: "tv",
    },
  ],
]);

const emptyMap = new Map<string, MediaListItem>();

describe("ToolVisualOutput", () => {
  describe("present_media", () => {
    it("renders skeleton for input-streaming", () => {
      const { container } = render(
        <MediaDetailProvider>
          <ToolVisualOutput
            toolName="present_media"
            state="input-streaming"
            input={undefined}
            searchResultsMap={searchResultsMap}
          />
        </MediaDetailProvider>,
      );

      expect(container.innerHTML).not.toBe("");
    });

    it("renders cards for input-available", () => {
      render(
        <MediaDetailProvider>
          <ToolVisualOutput
            toolName="present_media"
            state="input-available"
            input={{ media: [{ id: 1, media_type: "movie" }] }}
            searchResultsMap={searchResultsMap}
          />
        </MediaDetailProvider>,
      );

      expect(screen.getByAltText("Inception")).toBeInTheDocument();
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("renders cards for output-available", () => {
      render(
        <MediaDetailProvider>
          <ToolVisualOutput
            toolName="present_media"
            state="output-available"
            input={{
              media: [
                { id: 100, media_type: "tv" },
                { id: 1, media_type: "movie" },
              ],
            }}
            searchResultsMap={searchResultsMap}
          />
        </MediaDetailProvider>,
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });

    it("renders fallback card when ID not in search results", () => {
      render(
        <MediaDetailProvider>
          <ToolVisualOutput
            toolName="present_media"
            state="output-available"
            input={{ media: [{ id: 999, media_type: "movie" }] }}
            searchResultsMap={emptyMap}
          />
        </MediaDetailProvider>,
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("shows error for output-error state", () => {
      render(
        <MediaDetailProvider>
          <ToolVisualOutput
            toolName="present_media"
            state="output-error"
            input={undefined}
            searchResultsMap={searchResultsMap}
          />
        </MediaDetailProvider>,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("watch_providers", () => {
    it("renders skeleton for input-streaming", () => {
      const { container } = render(
        <ToolVisualOutput
          toolName="watch_providers"
          state="input-streaming"
          input={{ id: 550, media_type: "movie", region: "US" }}
          searchResultsMap={emptyMap}
        />,
      );

      expect(container.innerHTML).not.toBe("");
    });

    it("renders card for output-available", () => {
      render(
        <ToolVisualOutput
          toolName="watch_providers"
          state="output-available"
          input={{ id: 550, media_type: "movie", region: "US" }}
          output={{
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
          }}
          searchResultsMap={emptyMap}
        />,
      );

      expect(screen.getByText("Where to Watch")).toBeInTheDocument();
      expect(screen.getByAltText("Netflix")).toBeInTheDocument();
    });

    it("shows error for output-error", () => {
      render(
        <ToolVisualOutput
          toolName="watch_providers"
          state="output-error"
          input={{ id: 550, media_type: "movie", region: "US" }}
          searchResultsMap={emptyMap}
        />,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("non-present_media tools", () => {
    it("returns null for tmdb_search", () => {
      const { container } = render(
        <ToolVisualOutput
          toolName="tmdb_search"
          state="output-available"
          input={{ query: "test" }}
          searchResultsMap={searchResultsMap}
        />,
      );

      expect(container.innerHTML).toBe("");
    });

    it("returns null for semantic_search", () => {
      const { container } = render(
        <ToolVisualOutput
          toolName="semantic_search"
          state="output-available"
          input={{ query: "test" }}
          searchResultsMap={searchResultsMap}
        />,
      );

      expect(container.innerHTML).toBe("");
    });

    it("returns null for unknown tools", () => {
      const { container } = render(
        <ToolVisualOutput
          toolName="unknown_tool"
          state="output-available"
          input={{}}
          searchResultsMap={emptyMap}
        />,
      );

      expect(container.innerHTML).toBe("");
    });
  });
});
