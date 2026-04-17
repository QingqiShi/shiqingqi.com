import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import type { MediaListItem } from "#src/utils/types.ts";
import { MediaDetailProvider } from "./media-detail-context";
import { ToolMediaCards } from "./tool-media-cards";

const mockItems: ReadonlyArray<MediaListItem> = [
  {
    id: 1,
    title: "Inception",
    posterPath: "/inception.jpg",
    rating: 8.4,
    mediaType: "movie",
  },
  {
    id: 2,
    title: "Breaking Bad",
    posterPath: "/bb.jpg",
    rating: 9.5,
    mediaType: "tv",
  },
];

describe("ToolMediaCards", () => {
  it("renders a labeled, keyboard-focusable list", () => {
    render(
      <MediaDetailProvider>
        <ToolMediaCards items={mockItems} />
      </MediaDetailProvider>,
    );

    const list = screen.getByRole("list", { name: "Search results" });
    expect(list).toHaveAttribute("tabindex", "0");
  });

  it("renders cards as buttons", () => {
    render(
      <MediaDetailProvider>
        <ToolMediaCards items={mockItems} />
      </MediaDetailProvider>,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("renders poster images with empty alt so the button's label is not duplicated", () => {
    render(
      <MediaDetailProvider>
        <ToolMediaCards items={mockItems} />
      </MediaDetailProvider>,
    );

    const inceptionButton = screen.getByRole("button", { name: "Inception" });
    const inceptionImg = inceptionButton.querySelector("img");
    expect(inceptionImg).not.toBeNull();
    expect(inceptionImg?.getAttribute("src")).toContain("/inception.jpg");
    expect(inceptionImg).toHaveAttribute("alt", "");

    const bbButton = screen.getByRole("button", { name: "Breaking Bad" });
    const bbImg = bbButton.querySelector("img");
    expect(bbImg).not.toBeNull();
    expect(bbImg).toHaveAttribute("alt", "");
  });

  it("returns null when items array is empty", () => {
    const { container } = render(
      <MediaDetailProvider>
        <ToolMediaCards items={[]} />
      </MediaDetailProvider>,
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders all cards when items share the same TMDB id but differ by media type", () => {
    render(
      <MediaDetailProvider>
        <ToolMediaCards
          items={[
            {
              id: 123,
              title: "Same ID Movie",
              posterPath: "/movie.jpg",
              rating: 7.0,
              mediaType: "movie",
            },
            {
              id: 123,
              title: "Same ID TV Show",
              posterPath: "/tv.jpg",
              rating: 8.0,
              mediaType: "tv",
            },
          ]}
        />
      </MediaDetailProvider>,
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("renders cards without buttons when mediaType is null", () => {
    render(
      <MediaDetailProvider>
        <ToolMediaCards
          items={[
            {
              id: 99,
              title: "Unknown Type",
              posterPath: "/unknown.jpg",
              rating: 5.0,
              mediaType: null,
            },
          ]}
        />
      </MediaDetailProvider>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByAltText("Unknown Type")).toBeInTheDocument();
  });
});
