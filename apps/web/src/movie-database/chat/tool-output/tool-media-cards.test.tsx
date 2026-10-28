import { describe, expect, it } from "vitest";
import { MediaDetailProvider } from "#src/movie-database/details/media-detail-provider.tsx";
import { render, screen } from "#src/testing/test-utils.tsx";
import { ToolMediaCards } from "./tool-media-cards";

describe("ToolMediaCards", () => {
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

    expect(
      screen.getByRole("button", { name: "Same ID Movie" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Same ID TV Show" }),
    ).toBeInTheDocument();
  });
});
