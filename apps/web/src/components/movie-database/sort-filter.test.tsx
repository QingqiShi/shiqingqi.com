import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { MediaFiltersProvider } from "./media-filters-provider";
import { SortFilter } from "./sort-filter";

// jsdom gap: the provider's scroll-to-top path reads reduced-motion via
// matchMedia.
beforeAll(() => {
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

function Harness({ children }: { children: ReactNode }) {
  return (
    <PathnameContext value="/movie-database">
      <MediaFiltersProvider>{children}</MediaFiltersProvider>
    </PathnameContext>
  );
}

function getPopularityButton() {
  return screen.getByRole("radio", { name: /Popularity/ });
}

function getRatingButton() {
  return screen.getByRole("radio", { name: /Rating/ });
}

describe("SortFilter accessible-name direction semantics", () => {
  it("labels the default active Popularity segment as descending with a prompt to flip", () => {
    render(
      <Harness>
        <SortFilter />
      </Harness>,
    );

    expect(getPopularityButton()).toHaveAccessibleName(
      "Popularity, descending. Activate to sort ascending.",
    );
  });

  it("labels the inactive Rating segment without a direction clause", () => {
    render(
      <Harness>
        <SortFilter />
      </Harness>,
    );

    expect(getRatingButton()).toHaveAccessibleName("Rating");
  });

  it("flips to an ascending clause after clicking the active Popularity segment", async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <SortFilter />
      </Harness>,
    );

    await user.click(getPopularityButton());

    expect(getPopularityButton()).toHaveAccessibleName(
      "Popularity, ascending. Activate to sort descending.",
    );
  });

  it("activates Rating in descending mode when switching sort fields", async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <SortFilter />
      </Harness>,
    );

    await user.click(getRatingButton());

    expect(getRatingButton()).toHaveAccessibleName(
      "Rating, descending. Activate to sort ascending.",
    );
    // Popularity reverts to its plain name once Rating takes over.
    expect(getPopularityButton()).toHaveAccessibleName("Popularity");
  });

  it("shows the direction arrow without reading it out", () => {
    render(
      <Harness>
        <SortFilter />
      </Harness>,
    );

    const popularity = getPopularityButton();
    expect(popularity).toHaveTextContent("Popularity ↓");
    expect(popularity).toHaveAccessibleName(
      "Popularity, descending. Activate to sort ascending.",
    );
  });
});
