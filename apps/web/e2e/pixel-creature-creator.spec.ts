import { expect, test } from "@playwright/test";

/**
 * Pixel Creature Creator — visual + integration coverage.
 *
 * Visual regression here is intentionally minimal. The previous matrix
 * (4 species × 7 emotions × 2 themes + parts coverage = 64 baselines) locked
 * down every pixel of every sprite, which made every art touch-up a 64-PNG
 * re-bake without actually catching user-visible quality issues like edge
 * fringing — a regressed baseline diff just freezes whatever was current at
 * bake time.
 *
 * Instead:
 *  - One smoke screenshot per theme to catch catastrophic pipeline breakage
 *    (composition, scale, hue-rotate). Two PNGs total.
 *  - CSS assertions for the rendering invariants that don't need pixel diffs
 *    (`image-rendering: pixelated`).
 *  - Integer-pixel motion is unit-tested directly in
 *    `sprite/motion-math.test.ts`; no e2e coverage needed.
 *  - Two integration tests (landing → save, wizard happy path) cover the
 *    user-visible flows.
 */

test.describe("Sprite render smoke", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`canonical feline-leaf idle (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/en/playground/pixel-gallery?paused=1");
      const locator = page.getByTestId("canonical-feline-leaf-idle");
      await expect(locator).toBeVisible();
      // Tolerance absorbs sub-pixel rendering drift between the macOS dev
      // baseline and the Linux Playwright container — even with
      // `image-rendering: pixelated` the type-tinted hue-rotate filter
      // and container edges round differently per OS. 200 / (252×274 ≈
      // 69k) is ~0.3 %, generous enough to swallow that noise but tiny
      // compared to any catastrophic pipeline regression (wrong sprite,
      // wrong scale, broken composition) which would diff orders of
      // magnitude more pixels.
      await expect(locator).toHaveScreenshot(
        `canonical-feline-leaf-idle-${colorScheme}.png`,
        { animations: "disabled", maxDiffPixels: 200 },
      );
    });
  }

  test("body image uses pixelated image-rendering", async ({ page }) => {
    await page.goto("/en/playground/pixel-gallery?paused=1");
    const sprite = page.getByTestId("canonical-feline-leaf-idle");
    await expect(sprite).toBeVisible();
    const img = sprite.locator("img").first();
    await expect(img).toHaveCSS("image-rendering", "pixelated");
  });
});

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
    context,
    page,
  }) => {
    // Clear localStorage so the "Your creations" assertion starts empty.
    await page.goto("/en/pixel-creature-creator");
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

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
    await expect(page.getByTestId("featured-row")).toBeVisible();
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

/**
 * Wizard happy-path walk-through.
 *
 * Steps through each of the four wizard steps with a sensible click, types
 * a name, hits Finish, and asserts the URL ends up at `/c#<hash>` with the
 * stub review card rendered. We rely on the data-testid hooks the step
 * components expose so the spec stays decoupled from copy that may shift.
 *
 * The wizard's initial state is randomised, so step 2 cannot assume any
 * particular accessory is free; we deselect every accessory the random
 * generator picked before clicking the one we want — that keeps the test
 * deterministic without leaking implementation details.
 */
test.describe("Wizard happy path", () => {
  test("walks all four steps and lands on the review stub", async ({
    page,
  }) => {
    await page.goto("/en/pixel-creature-creator/create");
    await expect(page.getByTestId("wizard-shell")).toBeVisible();

    // Step 1 — pick a species.
    await expect(page.getByTestId("wizard-step-species")).toBeVisible();
    await page.getByTestId("species-option-feline").click();
    await page.getByTestId("wizard-next").click();

    // Step 2 — clear any randomly-selected accessories, then pick the bow.
    await expect(page.getByTestId("wizard-step-features")).toBeVisible();
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

    // Step 3 — pick a default emotion and an elemental type.
    await expect(page.getByTestId("wizard-step-vibe")).toBeVisible();
    await page.getByTestId("vibe-option-joy").click();
    await page.getByTestId("type-option-leaf").click();
    await page.getByTestId("wizard-next").click();

    // Step 4 — type a name and finish.
    await expect(page.getByTestId("wizard-step-name")).toBeVisible();
    const nameInput = page.getByTestId("creature-name-input");
    await nameInput.fill("Mochi");
    await page.getByTestId("wizard-finish").click();

    // The wizard navigates to `/en/pixel-creature-creator/c#<encoded>`.
    // The i18n router strips the default-locale prefix on a same-document
    // redirect, so the visible URL is `/pixel-creature-creator/c#<encoded>`
    // — match either form here so the test works under both rewrite modes.
    await expect(page.getByTestId("review-screen")).toBeVisible();
    await expect(page.getByTestId("creature-card")).toBeVisible();
    const finalUrl = page.url();
    expect(finalUrl).toMatch(
      /\/(en\/)?pixel-creature-creator\/c#[A-Za-z0-9_-]+$/,
    );
    const hash = new URL(finalUrl).hash;
    expect(hash.length).toBeGreaterThan(1);
  });
});
