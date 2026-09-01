import { describe, expect, it } from "vitest";
import { render, screen, userEvent, within } from "#src/test-utils.tsx";
import { OverviewBrowser, type OverviewEntry } from "./overview-browser.tsx";
import type { DesignSystemGroupLabels } from "./route-copy/get-design-system-group-labels.ts";

// A stand-in for the server-rendered tile: the browser never looks inside one,
// it only places it, so a link is enough to find it by name.
function entry(path: OverviewEntry["path"], label: string): OverviewEntry {
  return { path, label, tile: <a href={path}>{label}</a> };
}

const ENTRIES: OverviewEntry[] = [
  entry("/design-system/foundations/color", "Color"),
  entry("/design-system/components/button", "Button"),
  entry("/design-system/components/overlay", "Overlay"),
  entry("/design-system/components/avatar", "Avatar"),
  entry("/design-system/primitives", "Primitives"),
];

const ALPHABETICAL = [
  "/design-system/components/avatar",
  "/design-system/components/button",
  "/design-system/foundations/color",
  "/design-system/components/overlay",
  "/design-system/primitives",
] as const;

// The headings the server resolves. Only the ones these entries fall under are
// asserted; the rest are here because the prop is a total map.
const GROUP_LABELS: DesignSystemGroupLabels = {
  sections: {
    overview: null,
    foundations: "Foundations",
    components: "Components",
    composition: "Composition",
  },
  categories: {
    visual: "Visual",
    behaviour: "Behaviour",
    content: "Content",
    actions: "Actions",
    forms: "Forms",
    dataDisplay: "Data display",
    feedback: "Feedback",
    surfaces: "Surfaces",
    shells: "Page shells",
  },
};

function renderBrowser() {
  return render(
    <OverviewBrowser
      entries={ENTRIES}
      alphabeticalOrder={ALPHABETICAL}
      groupLabels={GROUP_LABELS}
    />,
  );
}

/** Every tile's name, in the order it renders. */
function tileOrder() {
  return screen.getAllByRole("link").map((link) => link.textContent);
}

describe("OverviewBrowser", () => {
  it("groups by section and category, so a component reads as a component", () => {
    renderBrowser();

    const components = screen.getByRole("heading", { name: "Components" });
    const section = components.closest("section");
    if (!section) throw new Error("expected a containing section");
    expect(
      within(section)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["Actions", "Data display", "Surfaces"]);
    expect(screen.getByRole("heading", { name: "Foundations" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Composition" })).toBeVisible();
  });

  it("sorts by the order the server collated, with no headings", async () => {
    renderBrowser();

    await userEvent.click(screen.getByRole("radio", { name: "A–Z" }));

    expect(tileOrder()).toEqual([
      "Avatar",
      "Button",
      "Color",
      "Overlay",
      "Primitives",
    ]);
    expect(screen.queryByRole("heading", { name: "Components" })).toBeNull();
  });

  it("searches by a word the visitor arrives with, not only by name", async () => {
    renderBrowser();

    await userEvent.type(screen.getByRole("searchbox"), "modal");

    expect(tileOrder()).toEqual(["Overlay"]);
    expect(screen.getByRole("status")).toHaveTextContent("1 result");
  });

  it("drops the headings of groups the search emptied", async () => {
    renderBrowser();

    await userEvent.type(screen.getByRole("searchbox"), "color");

    expect(screen.getByRole("heading", { name: "Foundations" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Components" })).toBeNull();
  });

  it("offers a way back when nothing matches", async () => {
    renderBrowser();

    await userEvent.type(screen.getByRole("searchbox"), "carousel");

    expect(screen.queryAllByRole("link")).toEqual([]);
    expect(screen.getByRole("status")).toHaveTextContent("0 results");

    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(tileOrder()).toHaveLength(ENTRIES.length);
  });
});
