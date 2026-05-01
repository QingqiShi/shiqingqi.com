import type { UseSuspenseInfiniteQueryResult } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { render } from "#src/test-utils.tsx";
import type { MediaListItem } from "#src/utils/types.ts";
import { MediaVirtuosoGrid } from "./media-virtuoso-grid";

function makeItems(count: number): MediaListItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Movie ${(i + 1).toString()}`,
    posterPath: null,
    rating: 7,
    mediaType: "movie" as const,
  }));
}

function makeQueryResult(
  items: MediaListItem[],
): UseSuspenseInfiniteQueryResult<MediaListItem[]> {
  return {
    data: items,
    fetchNextPage: () => Promise.resolve({}) as never,
    hasNextPage: false,
    isFetching: false,
    isFetchingNextPage: false,
    isFetchingPreviousPage: false,
    fetchPreviousPage: () => Promise.resolve({}) as never,
    hasPreviousPage: false,
    // remaining required fields from UseSuspenseInfiniteQueryResult
    dataUpdatedAt: Date.now(),
    error: null,
    errorUpdateCount: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    isEnabled: true,
    isError: false as const,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetchNextPageError: false as const,
    isFetchPreviousPageError: false as const,
    isInitialLoading: false,
    isLoading: false as const,
    isLoadingError: false as const,
    isPaused: false,
    isPending: false as const,
    isRefetchError: false as const,
    isRefetching: false,
    isStale: false,
    isSuccess: true as const,
    refetch: () => Promise.resolve({}) as never,
    status: "success" as const,
    fetchStatus: "idle" as const,
  };
}

describe("MediaVirtuosoGrid", () => {
  it("does not crash when data shrinks below the initial item count", () => {
    const fiveItems = makeItems(5);
    const twoItems = makeItems(2);

    const { rerender } = render(
      <MediaVirtuosoGrid
        queryResult={makeQueryResult(fiveItems)}
        virtuosoKey="test-key"
        notFoundLabel="No items"
      />,
    );

    // Simulate navigation back: component re-renders with fewer items
    // but React state (initialItemCount) is preserved from the first render.
    expect(() => {
      rerender(
        <MediaVirtuosoGrid
          queryResult={makeQueryResult(twoItems)}
          virtuosoKey="test-key"
          notFoundLabel="No items"
        />,
      );
    }).not.toThrow();
  });
});
