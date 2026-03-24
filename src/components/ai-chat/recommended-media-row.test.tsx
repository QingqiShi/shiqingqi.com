import { createHash } from "node:crypto";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import { I18nContext } from "#src/i18n/i18n-context.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { RecommendedMediaRow } from "./recommended-media-row";

function hashKey(en: string, zh: string) {
  return createHash("sha256")
    .update(en + "\0" + zh)
    .digest("hex")
    .slice(0, 8);
}

const translations = {
  [hashKey("No Poster", "无海报")]: "No Poster",
  [hashKey("User rating", "用户评分")]: "User rating",
};

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

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

  // Pre-seed TMDB configuration so PosterImage doesn't suspend forever
  queryClient.setQueryData(tmdbQueries.configuration.queryKey, {
    images: {
      base_url: "http://image.tmdb.org/t/p/",
      secure_base_url: "https://image.tmdb.org/t/p/",
      poster_sizes: ["w92", "w154", "w185", "w342", "w500", "w780", "original"],
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nContext value={{ translations }}>
        <Suspense>{ui}</Suspense>
      </I18nContext>
    </QueryClientProvider>,
  );
}

describe("RecommendedMediaRow", () => {
  it("renders section title", () => {
    renderWithProviders(
      <RecommendedMediaRow title="Trending Movies" items={mockItems} />,
    );
    expect(
      screen.getByRole("heading", { name: "Trending Movies" }),
    ).toBeInTheDocument();
  });

  it("renders poster images for each item", () => {
    renderWithProviders(
      <RecommendedMediaRow title="Trending Movies" items={mockItems} />,
    );
    expect(screen.getByAltText("Movie One")).toBeInTheDocument();
    expect(screen.getByAltText("Movie Two")).toBeInTheDocument();
  });

  it("renders rating badges", () => {
    renderWithProviders(
      <RecommendedMediaRow title="Trending Movies" items={mockItems} />,
    );
    expect(screen.getByText("8.5")).toBeInTheDocument();
    expect(screen.getByText("7.2")).toBeInTheDocument();
  });

  it("does not render links", () => {
    renderWithProviders(
      <RecommendedMediaRow title="Trending Movies" items={mockItems} />,
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders no-poster fallback when posterPath is null", () => {
    renderWithProviders(
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
      />,
    );

    expect(screen.getByText("No Poster Movie")).toBeInTheDocument();
    expect(screen.getByText("No Poster")).toBeInTheDocument();
  });

  it("renders nothing when items array is empty", () => {
    const { container } = renderWithProviders(
      <RecommendedMediaRow title="Trending Movies" items={[]} />,
    );
    expect(container.querySelector("section")).toBeNull();
  });
});
