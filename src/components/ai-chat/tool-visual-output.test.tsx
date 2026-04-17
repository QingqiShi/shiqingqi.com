import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import type { MediaListItem, PersonListItem } from "#src/utils/types.ts";
import { ChatActionsContext } from "./chat-actions-context";
import { MediaDetailProvider } from "./media-detail-context";
import { ToolVisualOutput } from "./tool-visual-output";
import type { WatchProviderOutput } from "./tool-watch-providers";

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
const emptyWpMap = new Map<string, WatchProviderOutput>();

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
            watchProvidersMap={emptyWpMap}
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
            watchProvidersMap={emptyWpMap}
          />
        </MediaDetailProvider>,
      );

      // Button carries the title via aria-label; the img inside has empty
      // alt to avoid duplicate announcements.
      const button = screen.getByRole("button", { name: "Inception" });
      expect(button).toBeInTheDocument();
      expect(button.querySelector("img")).toHaveAttribute("alt", "");
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
            watchProvidersMap={emptyWpMap}
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
            watchProvidersMap={emptyWpMap}
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
            watchProvidersMap={emptyWpMap}
          />
        </MediaDetailProvider>,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("present_watch_providers", () => {
    const watchProvidersMap = new Map<string, WatchProviderOutput>([
      [
        "wp:region:550:movie:US",
        {
          type: "region",
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
        },
      ],
    ]);

    it("renders skeleton for input-streaming", () => {
      const { container } = render(
        <ToolVisualOutput
          toolName="present_watch_providers"
          state="input-streaming"
          input={undefined}
          searchResultsMap={emptyMap}
          personResultsMap={emptyPersonMap}
          watchProvidersMap={emptyWpMap}
        />,
      );

      expect(container.innerHTML).not.toBe("");
    });

    it("renders card for input-available from map", () => {
      render(
        <ToolVisualOutput
          toolName="present_watch_providers"
          state="input-available"
          input={{ id: 550, media_type: "movie", region: "US" }}
          searchResultsMap={emptyMap}
          personResultsMap={emptyPersonMap}
          watchProvidersMap={watchProvidersMap}
        />,
      );

      expect(screen.getByText("Where to Watch")).toBeInTheDocument();
      expect(screen.getByAltText("Netflix")).toBeInTheDocument();
    });

    it("returns null when not found in map", () => {
      const { container } = render(
        <ToolVisualOutput
          toolName="present_watch_providers"
          state="input-available"
          input={{ id: 999, media_type: "movie", region: "GB" }}
          searchResultsMap={emptyMap}
          personResultsMap={emptyPersonMap}
          watchProvidersMap={emptyWpMap}
        />,
      );

      expect(container.innerHTML).toBe("");
    });

    it("shows error for output-error", () => {
      render(
        <ToolVisualOutput
          toolName="present_watch_providers"
          state="output-error"
          input={{ id: 550, media_type: "movie", region: "US" }}
          searchResultsMap={emptyMap}
          personResultsMap={emptyPersonMap}
          watchProvidersMap={emptyWpMap}
        />,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("present_provider_regions", () => {
    const watchProvidersMap = new Map<string, WatchProviderOutput>([
      [
        "wp:provider:550:movie:netflix",
        {
          type: "providerSearch",
          id: 550,
          mediaType: "movie",
          providerName: "Netflix",
          providerLogoPath: "/netflix.jpg",
          regions: [
            { country: "US", types: ["flatrate"] },
            { country: "GB", types: ["flatrate", "ads"] },
          ],
        },
      ],
    ]);

    it("renders skeleton for input-streaming", () => {
      const { container } = render(
        <ToolVisualOutput
          toolName="present_provider_regions"
          state="input-streaming"
          input={undefined}
          searchResultsMap={emptyMap}
          personResultsMap={emptyPersonMap}
          watchProvidersMap={emptyWpMap}
        />,
      );

      expect(container.innerHTML).not.toBe("");
    });

    it("renders provider search card from map", () => {
      render(
        <ToolVisualOutput
          toolName="present_provider_regions"
          state="input-available"
          input={{ id: 550, media_type: "movie", provider_name: "Netflix" }}
          searchResultsMap={emptyMap}
          personResultsMap={emptyPersonMap}
          watchProvidersMap={watchProvidersMap}
        />,
      );

      expect(screen.getByText("Netflix")).toBeInTheDocument();
      expect(screen.getByText("2 regions")).toBeInTheDocument();
      expect(screen.getByText("United States")).toBeInTheDocument();
      expect(screen.getAllByText("United Kingdom")).toHaveLength(2);
    });

    it("returns null when not found in map", () => {
      const { container } = render(
        <ToolVisualOutput
          toolName="present_provider_regions"
          state="input-available"
          input={{
            id: 999,
            media_type: "movie",
            provider_name: "Disney Plus",
          }}
          searchResultsMap={emptyMap}
          personResultsMap={emptyPersonMap}
          watchProvidersMap={emptyWpMap}
        />,
      );

      expect(container.innerHTML).toBe("");
    });

    it("shows error for output-error", () => {
      render(
        <ToolVisualOutput
          toolName="present_provider_regions"
          state="output-error"
          input={{ id: 550, media_type: "movie", provider_name: "Netflix" }}
          searchResultsMap={emptyMap}
          personResultsMap={emptyPersonMap}
          watchProvidersMap={emptyWpMap}
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
            watchProvidersMap={emptyWpMap}
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
            watchProvidersMap={emptyWpMap}
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
            watchProvidersMap={emptyWpMap}
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
            watchProvidersMap={emptyWpMap}
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
            watchProvidersMap={emptyWpMap}
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
            watchProvidersMap={emptyWpMap}
          />
        </MediaDetailProvider>,
      );

      expect(container.innerHTML).toBe("");
    });
  });

  describe("review_summary", () => {
    const mockActions = {
      sendMessage: () => {},
      attachedMedia: null,
      setAttachedMedia: () => {},
    };

    it("renders skeleton for input-streaming", () => {
      const { container } = render(
        <ChatActionsContext value={mockActions}>
          <ToolVisualOutput
            toolName="review_summary"
            state="input-streaming"
            input={undefined}
            searchResultsMap={emptyMap}
            personResultsMap={emptyPersonMap}
            watchProvidersMap={emptyWpMap}
          />
        </ChatActionsContext>,
      );

      expect(container.innerHTML).not.toBe("");
    });

    it("renders skeleton for input-available", () => {
      const { container } = render(
        <ChatActionsContext value={mockActions}>
          <ToolVisualOutput
            toolName="review_summary"
            state="input-available"
            input={{
              id: 550,
              media_type: "movie",
              title: "Fight Club",
              spiciness: 3,
            }}
            searchResultsMap={emptyMap}
            personResultsMap={emptyPersonMap}
            watchProvidersMap={emptyWpMap}
          />
        </ChatActionsContext>,
      );

      expect(container.innerHTML).not.toBe("");
    });

    it("renders card for output-available", () => {
      render(
        <ChatActionsContext value={mockActions}>
          <ToolVisualOutput
            toolName="review_summary"
            state="output-available"
            input={{
              id: 550,
              media_type: "movie",
              title: "Fight Club",
              spiciness: 3,
            }}
            output={{
              id: 550,
              mediaType: "movie",
              title: "Fight Club",
              spiciness: 3,
              summary: "A mind-bending thriller.",
              reviewCount: 10,
              averageRating: 8.5,
            }}
            searchResultsMap={emptyMap}
            personResultsMap={emptyPersonMap}
            watchProvidersMap={emptyWpMap}
            isLastAssistantMessage
          />
        </ChatActionsContext>,
      );

      expect(screen.getByText("Review Summary")).toBeInTheDocument();
      expect(screen.getByText("A mind-bending thriller.")).toBeInTheDocument();
    });

    it("shows error for output-error", () => {
      render(
        <ToolVisualOutput
          toolName="review_summary"
          state="output-error"
          input={{
            id: 550,
            media_type: "movie",
            title: "Fight Club",
            spiciness: 3,
          }}
          searchResultsMap={emptyMap}
          personResultsMap={emptyPersonMap}
          watchProvidersMap={emptyWpMap}
        />,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("returns null for invalid output", () => {
      const { container } = render(
        <ChatActionsContext value={mockActions}>
          <ToolVisualOutput
            toolName="review_summary"
            state="output-available"
            input={{
              id: 550,
              media_type: "movie",
              title: "Fight Club",
              spiciness: 3,
            }}
            output={{ invalid: true }}
            searchResultsMap={emptyMap}
            personResultsMap={emptyPersonMap}
            watchProvidersMap={emptyWpMap}
          />
        </ChatActionsContext>,
      );

      expect(container.innerHTML).toBe("");
    });
  });

  describe("non-visual tools", () => {
    it("returns null for tmdb_search", () => {
      const { container } = render(
        <ToolVisualOutput
          toolName="tmdb_search"
          state="output-available"
          input={{ query: "test" }}
          searchResultsMap={searchResultsMap}
          personResultsMap={emptyPersonMap}
          watchProvidersMap={emptyWpMap}
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
          watchProvidersMap={emptyWpMap}
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
          watchProvidersMap={emptyWpMap}
        />,
      );

      expect(container.innerHTML).toBe("");
    });
  });
});
