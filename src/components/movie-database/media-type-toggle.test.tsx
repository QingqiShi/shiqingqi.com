import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { MediaFiltersProvider } from "./media-filters-provider";
import { MediaTypeToggle } from "./media-type-toggle";

// jsdom gaps: AnchorButton's press-handlers hook needs pointer-capture,
// and the provider's scroll-to-top path reads reduced-motion via matchMedia.
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  if (!window.matchMedia) {
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
  }
});

function Harness({ children }: { children: ReactNode }) {
  return (
    <PathnameContext value="/movie-database">
      <MediaFiltersProvider>{children}</MediaFiltersProvider>
    </PathnameContext>
  );
}

function getMoviesButton() {
  return screen.getByRole("link", { name: "Movies" });
}

function getTvButton() {
  return screen.getByRole("link", { name: "TV Shows" });
}

describe("MediaTypeToggle", () => {
  it("marks Movies active by default", () => {
    render(
      <Harness>
        <MediaTypeToggle />
      </Harness>,
    );

    expect(getMoviesButton().className).toContain("active");
    expect(getTvButton().className).not.toContain("active");
  });

  it("updates the active button when the user switches to TV Shows", async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <MediaTypeToggle />
      </Harness>,
    );

    await user.click(getTvButton());

    // Before the fix, reading `mediaType` from `useSearchParams()` left this
    // assertion stuck on Movies because the provider commits via
    // `window.history.replaceState`, which Next's SearchParamsContext
    // does not observe. Reading from `useMediaFilters()` resolves the drift.
    expect(getTvButton().className).toContain("active");
    expect(getMoviesButton().className).not.toContain("active");
  });

  it("switches back to Movies when toggled again", async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <MediaTypeToggle />
      </Harness>,
    );

    await user.click(getTvButton());
    expect(getTvButton().className).toContain("active");

    await user.click(getMoviesButton());
    expect(getMoviesButton().className).toContain("active");
    expect(getTvButton().className).not.toContain("active");
  });

  it("honors defaultFilters.mediaType on first paint", () => {
    render(
      <PathnameContext value="/movie-database">
        <MediaFiltersProvider defaultFilters={{ mediaType: "tv" }}>
          <MediaTypeToggle />
        </MediaFiltersProvider>
      </PathnameContext>,
    );

    expect(getTvButton().className).toContain("active");
    expect(getMoviesButton().className).not.toContain("active");
  });
});
