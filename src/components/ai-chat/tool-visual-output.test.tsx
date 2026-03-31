import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import type { MediaListItem, PersonListItem } from "#src/utils/types.ts";
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
const emptyPersonMap = new Map<number, PersonListItem>();

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
            personResultsMap={emptyPersonMap}
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
            personResultsMap={emptyPersonMap}
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
            personResultsMap={emptyPersonMap}
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
            personResultsMap={emptyPersonMap}
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
            personResultsMap={emptyPersonMap}
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
          personResultsMap={emptyPersonMap}
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
          personResultsMap={emptyPersonMap}
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
          personResultsMap={emptyPersonMap}
        />,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("present_person", () => {
    const personResultsMap = new Map<number, PersonListItem>([
      [
        42,
        {
          id: 42,
          name: "Leonardo DiCaprio",
          profilePath: "/leo.jpg",
          knownForDepartment: "Acting",
        },
      ],
      [
        99,
        {
          id: 99,
          name: "Christopher Nolan",
          profilePath: "/nolan.jpg",
          knownForDepartment: "Directing",
        },
      ],
    ]);

    it("renders skeleton for input-streaming", () => {
      const { container } = render(
        <MediaDetailProvider>
          <ToolVisualOutput
            toolName="present_person"
            state="input-streaming"
            input={undefined}
            searchResultsMap={emptyMap}
            personResultsMap={emptyPersonMap}
          />
        </MediaDetailProvider>,
      );

      expect(container.innerHTML).not.toBe("");
    });

    it("renders person cards for input-available", () => {
      render(
        <MediaDetailProvider>
          <ToolVisualOutput
            toolName="present_person"
            state="input-available"
            input={{ people: [{ id: 42 }] }}
            searchResultsMap={emptyMap}
            personResultsMap={personResultsMap}
          />
        </MediaDetailProvider>,
      );

      expect(
        screen.getByRole("button", { name: "Leonardo DiCaprio" }),
      ).toBeInTheDocument();
    });

    it("renders person cards for output-available", () => {
      render(
        <MediaDetailProvider>
          <ToolVisualOutput
            toolName="present_person"
            state="output-available"
            input={{
              people: [{ id: 42 }, { id: 99 }],
            }}
            searchResultsMap={emptyMap}
            personResultsMap={personResultsMap}
          />
        </MediaDetailProvider>,
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
    });

    it("renders fallback card when person ID not in results map", () => {
      render(
        <MediaDetailProvider>
          <ToolVisualOutput
            toolName="present_person"
            state="output-available"
            input={{ people: [{ id: 777 }] }}
            searchResultsMap={emptyMap}
            personResultsMap={emptyPersonMap}
          />
        </MediaDetailProvider>,
      );

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("shows error for output-error state", () => {
      render(
        <MediaDetailProvider>
          <ToolVisualOutput
            toolName="present_person"
            state="output-error"
            input={undefined}
            searchResultsMap={emptyMap}
            personResultsMap={emptyPersonMap}
          />
        </MediaDetailProvider>,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("returns null for empty people array", () => {
      const { container } = render(
        <MediaDetailProvider>
          <ToolVisualOutput
            toolName="present_person"
            state="output-available"
            input={{ people: [] }}
            searchResultsMap={emptyMap}
            personResultsMap={emptyPersonMap}
          />
        </MediaDetailProvider>,
      );

      expect(container.innerHTML).toBe("");
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
          personResultsMap={emptyPersonMap}
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
          personResultsMap={emptyPersonMap}
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
          personResultsMap={emptyPersonMap}
        />,
      );

      expect(container.innerHTML).toBe("");
    });
  });
});
