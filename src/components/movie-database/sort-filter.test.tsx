import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { MediaFiltersProvider } from "./media-filters-provider";
import { SortFilter } from "./sort-filter";

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
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
  return screen.getByRole("link", {
    name: /Sort by Popularity/,
  });
}

function getRatingButton() {
  return screen.getByRole("link", {
    name: /Sort by Rating/,
  });
}

describe("SortFilter aria-label direction semantics", () => {
  it("labels the default active Popularity button as descending with a prompt to flip", () => {
    render(
      <Harness>
        <SortFilter />
      </Harness>,
    );

    expect(getPopularityButton()).toHaveAttribute(
      "aria-label",
      "Sort by Popularity, descending. Activate to sort ascending.",
    );
  });

  it("labels the inactive Rating button without a direction", () => {
    render(
      <Harness>
        <SortFilter />
      </Harness>,
    );

    expect(getRatingButton()).toHaveAttribute("aria-label", "Sort by Rating.");
  });

  it("flips to ascending aria-label after clicking the active Popularity button", async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <SortFilter />
      </Harness>,
    );

    await user.click(getPopularityButton());

    expect(getPopularityButton()).toHaveAttribute(
      "aria-label",
      "Sort by Popularity, ascending. Activate to sort descending.",
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

    expect(getRatingButton()).toHaveAttribute(
      "aria-label",
      "Sort by Rating, descending. Activate to sort ascending.",
    );
    // Popularity reverts to inactive copy once Rating takes over.
    expect(getPopularityButton()).toHaveAttribute(
      "aria-label",
      "Sort by Popularity.",
    );
  });

  it("hides the visual arrow from assistive technology", () => {
    render(
      <Harness>
        <SortFilter />
      </Harness>,
    );

    const popularity = getPopularityButton();
    const arrowSpan = popularity.querySelector("span[aria-hidden='true']");
    expect(arrowSpan).toBeInTheDocument();
    expect(arrowSpan?.textContent).toContain("↓");
  });
});
