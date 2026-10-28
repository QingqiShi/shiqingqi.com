import { expect, test } from "@playwright/test";

/**
 * Landing → wizard → review → landing happy-path.
 *
 * Click through the home-page project card to the landing route, walk the
 * wizard, save the resulting creature on the review screen, then come
 * back to the landing route and assert the saved entry appears in
 * "Your creations". This is the integration test that verifies every page
 * hand-off in the user-visible flow.
 */
test.describe("Landing happy path", () => {
  test("home → landing → wizard → review → save → landing shows saved", async ({
    page,
  }) => {
    // Clear localStorage so the "Your creations" assertion starts empty.
    await page.goto("/en/pixel-creature-creator");
    await page.evaluate(() => {
      window.localStorage.clear();
    });

    // Step 1 — start on the home page and click the Pixel Creature Creator
    // project card.
    await page.goto("/en");
    const projectCard = page.getByRole("link", {
      name: /pixel creature creator.*build a tiny pixel creature/i,
    });
    await expect(projectCard).toBeVisible();
    await projectCard.click();

    // Step 2 — landing page renders with the CTA and an empty
    // "Your creations" strip.
    await expect(page.getByTestId("landing-cta")).toBeVisible();
    await expect(page.getByTestId("your-creations-empty")).toBeVisible();
    expect(page.url()).toMatch(/\/(en\/)?pixel-creature-creator$/);

    // Step 3 — click "Start creating" → wizard.
    await page.getByTestId("landing-cta").click();
    await expect(page.getByTestId("wizard-shell")).toBeVisible();

    // Step 4 — walk the four-step wizard happy path.
    await page.getByTestId("species-option-feline").click();
    await page.getByTestId("wizard-next").click();
    const accessoryIds = [
      "hat",
      "scarf",
      "antenna",
      "glasses",
      "leaf",
      "bow",
    ] as const;
    for (const id of accessoryIds) {
      const tile = page.getByTestId(`accessory-option-${id}`);
      if ((await tile.getAttribute("aria-pressed")) === "true") {
        await tile.click();
      }
    }
    await page.getByTestId("accessory-option-bow").click();
    await page.getByTestId("wizard-next").click();
    await page.getByTestId("vibe-option-joy").click();
    await page.getByTestId("type-option-leaf").click();
    await page.getByTestId("wizard-next").click();
    await page.getByTestId("creature-name-input").fill("Mochi");
    await page.getByTestId("wizard-finish").click();

    // Step 5 — save the creature on the review screen.
    await expect(page.getByTestId("review-screen")).toBeVisible();
    const saveButton = page.getByTestId("action-save");
    await saveButton.click();
    await expect(saveButton).toHaveAttribute("aria-pressed", "true");

    // Step 6 — back to the landing page; "Your creations" now includes
    // the saved creature.
    await page.goto("/en/pixel-creature-creator");
    await expect(page.getByTestId("your-creations")).toBeVisible();
    const items = page.getByTestId("your-creations-item");
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText("Mochi");
  });
});
