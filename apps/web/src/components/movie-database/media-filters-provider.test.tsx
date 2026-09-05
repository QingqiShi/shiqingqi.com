import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RetryableErrorBoundary } from "#src/components/shared/retryable-error-boundary.tsx";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { MediaFiltersProvider } from "./media-filters-provider";
import { MediaTypeToggle } from "./media-type-toggle";

const CLEARANCE_PX = "56px";
const CLEARANCE = Number.parseFloat(CLEARANCE_PX);
const originalGetComputedStyle = window.getComputedStyle.bind(window);

// jsdom gaps: the provider reads reduced-motion via matchMedia at scroll
// time, and lays out nothing, so scroll margin and element positions are
// stubbed per test.
beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function Bomb() {
  const [shouldThrow, setShouldThrow] = useState(false);
  if (shouldThrow) {
    throw new Error("boom");
  }
  return (
    <button
      type="button"
      onClick={() => {
        setShouldThrow(true);
      }}
    >
      Break
    </button>
  );
}

function SortByRating() {
  const { setSort } = useMediaFilters();
  return (
    <button
      type="button"
      onClick={() => {
        setSort("vote_average.desc");
      }}
    >
      Rating
    </button>
  );
}

function renderResultsAt(top: number) {
  render(
    <PathnameContext value="/movie-database">
      <MediaFiltersProvider>
        <SortByRating />
      </MediaFiltersProvider>
    </PathnameContext>,
  );
  const results = screen.getByRole("button", { name: "Rating" }).parentElement;
  if (!results) throw new Error("The provider renders no results element");
  results.getBoundingClientRect = () => new DOMRect(0, top);
  const scrollIntoView = vi.fn();
  results.scrollIntoView = scrollIntoView;
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) =>
    element === results
      ? Object.assign(originalGetComputedStyle(element), {
          scrollMarginBlockStart: CLEARANCE_PX,
        })
      : originalGetComputedStyle(element),
  );
  return { scrollIntoView };
}

describe("MediaFiltersProvider", () => {
  it("scrolls the results back under the header when a filter changes with the bar held there", async () => {
    const { scrollIntoView } = renderResultsAt(-400);

    await userEvent.click(screen.getByRole("button", { name: "Rating" }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("leaves the page where it is when the results top is still in view", async () => {
    const { scrollIntoView } = renderResultsAt(CLEARANCE + 200);

    await userEvent.click(screen.getByRole("button", { name: "Rating" }));

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("records the change in the URL", async () => {
    renderResultsAt(0);

    await userEvent.click(screen.getByRole("button", { name: "Rating" }));

    expect(window.location.search).toBe("?sort=vote_average.desc");
  });

  it("keeps a switched media type and its URL after an error boundary reset", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    render(
      <PathnameContext value="/movie-database">
        <RetryableErrorBoundary message="Something went wrong.">
          <MediaFiltersProvider defaultFilters={{ mediaType: "movie" }}>
            <MediaTypeToggle />
            <Bomb />
          </MediaFiltersProvider>
        </RetryableErrorBoundary>
      </PathnameContext>,
    );

    await user.click(screen.getByRole("radio", { name: /TV Shows/ }));
    expect(window.location.search).toBe("?type=tv");

    await user.click(screen.getByRole("button", { name: "Break" }));
    await user.click(await screen.findByRole("button", { name: "Try again" }));

    expect(screen.getByRole("radio", { name: /TV Shows/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(window.location.search).toBe("?type=tv");
  });
});
