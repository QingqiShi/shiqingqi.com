import { afterEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "#src/testing/test-utils.tsx";
import { createTestReplica } from "../transactions/testing/create-test-replica.ts";
import { renderWithReplica } from "../transactions/testing/render-with-replica.tsx";
import { FinanceTabView } from "./finance-tab-view.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

/** The Settings link in the rail and in the tab bar. */
function settingsTabs() {
  return screen
    .getAllByRole("navigation", { name: "Finance" })
    .map((nav) => within(nav).getByRole("link", { name: /^Settings/ }));
}

function badgeOf(link: HTMLElement) {
  return link.querySelector('[class*="attentionStyles."]');
}

function renderTabView() {
  return createTestReplica().then((runtime) => {
    renderWithReplica(
      runtime,
      <FinanceTabView>
        <p>Screen</p>
      </FinanceTabView>,
    );
    return runtime;
  });
}

describe("FinanceTabView", () => {
  it("shows the five destinations in the rail and in the tab bar", async () => {
    await renderTabView();
    const navs = screen.getAllByRole("navigation", { name: "Finance" });
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      expect(within(nav).getAllByRole("link")).toHaveLength(5);
    }
    expect(screen.getByRole("main")).toHaveTextContent("Screen");
  });

  it("shows no badge on Settings while sync is quiet", async () => {
    await renderTabView();

    for (const tab of settingsTabs()) {
      expect(tab).toHaveAccessibleName("Settings");
      expect(badgeOf(tab)).toBeNull();
      expect(within(tab).getByRole("status")).toBeEmptyDOMElement();
    }
  });

  it("marks Settings in the danger tone and names the problem when the server cannot be reached", async () => {
    const runtime = await renderTabView();

    await act(() => runtime.loop.sync());

    await waitFor(() => {
      for (const tab of settingsTabs()) {
        expect(tab).toHaveAccessibleName("Settings Can't reach the server");
      }
    });
    for (const tab of settingsTabs()) {
      expect(badgeOf(tab)?.className).toContain("attentionStyles.problem");
      expect(within(tab).getByRole("status")).toHaveTextContent(
        "Can't reach the server",
      );
    }
  });

  it("marks Settings in the warning tone when offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const runtime = await renderTabView();

    await act(() => runtime.loop.sync());

    await waitFor(() => {
      for (const tab of settingsTabs()) {
        expect(tab).toHaveAccessibleName("Settings Offline");
      }
    });
    for (const tab of settingsTabs()) {
      expect(badgeOf(tab)?.className).toContain("attentionStyles.waiting");
    }
  });
});
