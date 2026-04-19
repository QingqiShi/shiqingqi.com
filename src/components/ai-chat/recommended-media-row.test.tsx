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
    // One button per card, labelled with the media title.
    expect(
      screen.getByRole("button", { name: "Movie One" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Movie Two" }),
    ).toBeInTheDocument();
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

  it("renders cards as links when items carry an href", () => {
    const itemsWithHref = mockItems.map((item) => ({
      ...item,
      href: `/movie-database/${String(item.mediaType)}/${item.id.toString()}`,
    }));
    render(
      <RecommendedMediaRow title="Trending Movies" items={itemsWithHref} />,
    );
    const linkOne = screen.getByRole("link", { name: "Movie One" });
    const linkTwo = screen.getByRole("link", { name: "Movie Two" });
    expect(linkOne).toHaveAttribute("href", "/movie-database/movie/1");
    expect(linkTwo).toHaveAttribute("href", "/movie-database/movie/2");
    // Cards themselves must not be buttons — the only <button>s rendered are
    // the horizontal scroll nav buttons inside HorizontalScrollRow.
    expect(
      screen.queryByRole("button", { name: "Movie One" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Movie Two" }),
    ).not.toBeInTheDocument();
  });

  it("renders as links without a MediaDetailProvider when items carry an href", () => {
    const itemsWithHref = mockItems.map((item) => ({
      ...item,
      href: "/movie-database/movie/1",
    }));
    render(
      <RecommendedMediaRow
        title="Trending Movies"
        items={itemsWithHref}
        inset="standalone"
      />,
    );
    expect(screen.getByRole("link", { name: "Movie One" })).toBeInTheDocument();
  });
});
