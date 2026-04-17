import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import type { MediaListItem } from "#src/utils/types.ts";
import { MediaDetailProvider } from "./media-detail-context";
import { RecommendedMediaRow } from "./recommended-media-row";

const mockItems: ReadonlyArray<MediaListItem> = [
  {
    id: 1,
    title: "Movie One",
    posterPath: "/poster1.jpg",
    rating: 8.5,
    mediaType: "movie",
  },
  {
    id: 2,
    title: "Movie Two",
    posterPath: "/poster2.jpg",
    rating: 7.2,
    mediaType: "movie",
  },
];

describe("RecommendedMediaRow", () => {
  it("renders section title", () => {
    render(
      <MediaDetailProvider>
        <RecommendedMediaRow title="Trending Movies" items={mockItems} />
      </MediaDetailProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Trending Movies" }),
    ).toBeInTheDocument();
  });

  it("renders poster images for each item with empty alt (title is on the button label)", () => {
    render(
      <MediaDetailProvider>
        <RecommendedMediaRow title="Trending Movies" items={mockItems} />
      </MediaDetailProvider>,
    );
    const oneImg = screen
      .getByRole("button", { name: "Movie One" })
      .querySelector("img");
    const twoImg = screen
      .getByRole("button", { name: "Movie Two" })
      .querySelector("img");
    expect(oneImg).not.toBeNull();
    expect(oneImg).toHaveAttribute("alt", "");
    expect(twoImg).not.toBeNull();
    expect(twoImg).toHaveAttribute("alt", "");
  });

  it("renders rating badges", () => {
    render(
      <MediaDetailProvider>
        <RecommendedMediaRow title="Trending Movies" items={mockItems} />
      </MediaDetailProvider>,
    );
    expect(screen.getByText("8.5")).toBeInTheDocument();
    expect(screen.getByText("7.2")).toBeInTheDocument();
  });

  it("renders cards as buttons", () => {
    render(
      <MediaDetailProvider>
        <RecommendedMediaRow title="Trending Movies" items={mockItems} />
      </MediaDetailProvider>,
    );
    expect(screen.queryAllByRole("button")).toHaveLength(2);
  });

  it("renders no-poster fallback when posterPath is null", () => {
    render(
      <MediaDetailProvider>
        <RecommendedMediaRow
          title="Trending Movies"
          items={[
            {
              id: 99,
              title: "No Poster Movie",
              posterPath: null,
              rating: 6.3,
              mediaType: "movie",
            },
          ]}
        />
      </MediaDetailProvider>,
    );

    expect(screen.getByText("No Poster Movie")).toBeInTheDocument();
    expect(screen.getByText("No Poster")).toBeInTheDocument();
  });

  it("renders nothing when items array is empty", () => {
    const { container } = render(
      <MediaDetailProvider>
        <RecommendedMediaRow title="Trending Movies" items={[]} />
      </MediaDetailProvider>,
    );
    expect(container.querySelector("section")).toBeNull();
  });
});
