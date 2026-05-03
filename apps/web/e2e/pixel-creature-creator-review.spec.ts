import { promises as fs } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  DEFAULT_CREATURE,
  type CreatureDef,
} from "../src/components/pixel-creature-creator/state/creature-schema";
import { encodeCreature } from "../src/components/pixel-creature-creator/state/encode-decode";

// PNG file signature: 0x89 "P" "N" "G" CR LF SUB LF.
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Review screen end-to-end coverage.
 *
 * The wizard happy-path spec already verifies the wizard → review hand-off.
 * This file covers the review screen on its own — emotion toggling, save
 * persistence, copy-link clipboard wiring, and the edit deep-link.
 *
 * We construct the test creature deterministically by encoding a known
 * `CreatureDef` and dropping the result into the URL hash so the test
 * doesn't depend on the wizard's random initial state.
 */

const TEST_CREATURE: CreatureDef = {
  ...DEFAULT_CREATURE,
  name: "Mochi",
};

const ENCODED_HASH = encodeCreature(TEST_CREATURE);
const REVIEW_PATH = `/en/pixel-creature-creator/c#${ENCODED_HASH}`;

test.describe("Review screen", () => {
  test.beforeEach(async ({ context, page }) => {
    // Clipboard read/write so the copy-link assertion can verify the value.
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    // Clear localStorage at the start of every test so the "save → reload"
    // test starts from a clean slate. Visit any page so we have an origin
    // to scope storage to.
    await page.goto("/en/pixel-creature-creator/create");
    await page.evaluate(() => {
      window.localStorage.clear();
    });
  });

  test("renders the card and toggles emotions without errors", async ({
    page,
  }) => {
    await page.goto(REVIEW_PATH);

    await expect(page.getByTestId("review-screen")).toBeVisible();
    await expect(page.getByTestId("creature-card")).toBeVisible();
    await expect(page.getByTestId("emotion-toggle")).toBeVisible();

    const emotions = [
      "idle",
      "joy",
      "sad",
      "excited",
      "sleepy",
      "grumpy",
      "curious",
    ] as const;
    for (const emotion of emotions) {
      await page.getByTestId(`emotion-button-${emotion}`).click();
      await expect(
        page.getByTestId(`emotion-button-${emotion}`),
      ).toHaveAttribute("aria-pressed", "true");
      // The card stays visible — the sprite swap should not crash the tree.
      await expect(page.getByTestId("creature-card")).toBeVisible();
    }
  });

  test("save persists across reload", async ({ page }) => {
    await page.goto(REVIEW_PATH);
    const saveButton = page.getByTestId("action-save");
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toHaveAttribute("aria-pressed", "false");
    await saveButton.click();
    await expect(saveButton).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    const reloadedSave = page.getByTestId("action-save");
    await expect(reloadedSave).toHaveAttribute("aria-pressed", "true");
  });

  test("copy link writes the URL to the clipboard", async ({ page }) => {
    await page.goto(REVIEW_PATH);
    await page.getByTestId("action-copy-link").click();
    await expect(page.getByTestId("action-ephemeral")).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain(`#${ENCODED_HASH}`);
  });

  test("edit lands on /create with the same hash", async ({ page }) => {
    await page.goto(REVIEW_PATH);
    await page.getByTestId("action-edit").click();
    await expect(page.getByTestId("wizard-shell")).toBeVisible();
    const finalUrl = page.url();
    expect(finalUrl).toMatch(
      /\/(en\/)?pixel-creature-creator\/create#[A-Za-z0-9_-]+$/,
    );
    expect(new URL(finalUrl).hash).toBe(`#${ENCODED_HASH}`);
  });

  test("downloads sprite PNG", async ({ page }) => {
    await page.goto(REVIEW_PATH);
    await expect(page.getByTestId("review-screen")).toBeVisible();

    await page.getByTestId("action-download").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("action-download-sprite").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.png$/);
    const downloadPath = await download.path();
    const buf = await fs.readFile(downloadPath);
    // Verify the PNG file signature so we know we got a real raster, not a
    // truncated stream or an HTML error page handed to the browser.
    expect([...buf.subarray(0, 8)]).toEqual(PNG_MAGIC);
  });

  test("downloads card PNG", async ({ page }) => {
    await page.goto(REVIEW_PATH);
    await expect(page.getByTestId("review-screen")).toBeVisible();

    await page.getByTestId("action-download").click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("action-download-card").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.png$/);
    const downloadPath = await download.path();
    const buf = await fs.readFile(downloadPath);
    expect([...buf.subarray(0, 8)]).toEqual(PNG_MAGIC);
  });
});
