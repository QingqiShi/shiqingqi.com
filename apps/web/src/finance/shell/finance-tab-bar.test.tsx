import { afterEach, describe, expect, it, vi } from "vitest";
import { act, screen, within } from "#src/testing/test-utils.tsx";
import { createTestReplica } from "../transactions/testing/create-test-replica.ts";
import { renderWithReplica } from "../transactions/testing/render-with-replica.tsx";
import { FinanceTabBar } from "./finance-tab-bar.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

function settingsTab() {
  return within(screen.getByRole("navigation", { name: "Finance" })).getByRole(
    "link",
    { name: /^Settings/ },
  );
}

function badgeOf(link: HTMLElement) {
  return link.querySelector('[class*="attentionStyles."]');
}

describe("FinanceTabBar", () => {
  it("shows no badge on Settings while sync is quiet", async () => {
    const runtime = await createTestReplica();
    renderWithReplica(runtime, <FinanceTabBar />);

    expect(settingsTab()).toHaveAccessibleName("Settings");
    expect(badgeOf(settingsTab())).toBeNull();
    expect(within(settingsTab()).getByRole("status")).toBeEmptyDOMElement();
  });

  it("marks Settings in the danger tone and names the problem when the server cannot be reached", async () => {
    const runtime = await createTestReplica();
    renderWithReplica(runtime, <FinanceTabBar />);

    await act(() => runtime.loop.sync());

    expect(
      await screen.findByRole("link", {
        name: "Settings Can't reach the server",
      }),
    ).toBe(settingsTab());
    expect(badgeOf(settingsTab())?.className).toContain(
      "attentionStyles.problem",
    );
    expect(within(settingsTab()).getByRole("status")).toHaveTextContent(
      "Can't reach the server",
    );
  });

  it("marks Settings in the warning tone when offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const runtime = await createTestReplica();
    renderWithReplica(runtime, <FinanceTabBar />);

    await act(() => runtime.loop.sync());

    expect(await screen.findByRole("link", { name: "Settings Offline" })).toBe(
      settingsTab(),
    );
    expect(badgeOf(settingsTab())?.className).toContain(
      "attentionStyles.waiting",
    );
  });
});
