import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { MediaFiltersProvider } from "./media-filters-provider";
import { MediaTypeToggle } from "./media-type-toggle";
import { MediaViewToggle } from "./media-view-toggle";

// jsdom gaps: AnchorButton's press-handlers hook needs pointer-capture,
// and the provider's scroll-to-top path reads reduced-motion via matchMedia.
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.scrollTo = vi.fn();
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

function getGridButton() {
  return screen.getByRole("link", { name: "Poster grid" });
}

function getTableButton() {
  return screen.getByRole("link", { name: "Table" });
}

describe("MediaViewToggle", () => {
  it("marks the poster grid active by default", () => {
    render(
      <Harness>
        <MediaViewToggle />
      </Harness>,
    );

    expect(getGridButton().className).toContain("active");
    expect(getTableButton().className).not.toContain("active");
  });

  it("switches to the table view when the user picks it", async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <MediaViewToggle />
      </Harness>,
    );

    await user.click(getTableButton());

    expect(getTableButton().className).toContain("active");
    expect(getGridButton().className).not.toContain("active");
  });

  it("honors defaultFilters.view on first paint", () => {
    render(
      <PathnameContext value="/movie-database">
        <MediaFiltersProvider defaultFilters={{ view: "table" }}>
          <MediaViewToggle />
        </MediaFiltersProvider>
      </PathnameContext>,
    );

    expect(getTableButton().className).toContain("active");
  });

  it("keeps the view in the URL as other filters change", async () => {
    const user = userEvent.setup();
    render(
      <Harness>
        <MediaViewToggle />
        <MediaTypeToggle />
      </Harness>,
    );

    await user.click(getTableButton());
    // Switching media type clears every filter, but the layout choice is not
    // one — losing it here would bounce the user back to the poster grid.
    await user.click(screen.getByRole("link", { name: /TV Shows/ }));

    expect(getTableButton().className).toContain("active");
    expect(getTableButton().getAttribute("href")).toBe(
      "/movie-database?type=tv&view=table",
    );
  });
});
