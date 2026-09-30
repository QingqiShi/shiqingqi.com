import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { MediaFiltersProvider } from "./media-filters-provider";
import { MediaTypeToggle } from "./media-type-toggle";

function Harness({ children }: { children: ReactNode }) {
  return (
    <PathnameContext value="/movie-database">
      <MediaFiltersProvider>{children}</MediaFiltersProvider>
    </PathnameContext>
  );
}

function getMoviesButton() {
  return screen.getByRole("radio", { name: "Movies" });
}

function getTvButton() {
  return screen.getByRole("radio", { name: /TV Shows/ });
}

describe("MediaTypeToggle", () => {
  it("marks Movies active by default", () => {
    render(
      <Harness>
        <MediaTypeToggle />
      </Harness>,
    );

    expect(getMoviesButton()).toHaveAttribute("aria-checked", "true");
    expect(getTvButton()).toHaveAttribute("aria-checked", "false");
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
    expect(getTvButton()).toHaveAttribute("aria-checked", "true");
    expect(getMoviesButton()).toHaveAttribute("aria-checked", "false");
  });

  it("switches back to Movies when toggled again", async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <MediaTypeToggle />
      </Harness>,
    );

    await user.click(getTvButton());
    expect(getTvButton()).toHaveAttribute("aria-checked", "true");

    await user.click(getMoviesButton());
    expect(getMoviesButton()).toHaveAttribute("aria-checked", "true");
    expect(getTvButton()).toHaveAttribute("aria-checked", "false");
  });

  it("honors the URL's type param on first paint", () => {
    window.history.replaceState({}, "", "?type=tv");

    render(
      <Harness>
        <MediaTypeToggle />
      </Harness>,
    );

    expect(getTvButton()).toHaveAttribute("aria-checked", "true");
    expect(getMoviesButton()).toHaveAttribute("aria-checked", "false");
  });
});
