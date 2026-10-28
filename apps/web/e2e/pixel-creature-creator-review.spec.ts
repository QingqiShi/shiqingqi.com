import { promises as fs } from "node:fs";
import { expect, test } from "@playwright/test";
import {
  DEFAULT_CREATURE,
  type CreatureDef,
} from "../src/pixel-creature-creator/creature/creature-def-schema";
import { encodeCreature } from "../src/pixel-creature-creator/creature/encode-creature";

// PNG file signature: 0x89 "P" "N" "G" CR LF SUB LF.
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Review screen end-to-end coverage.
 *
 * The wizard happy-path spec already verifies the wizard → review hand-off.
 * This file covers sharing from the review screen on its own: the copy-link
 * clipboard wiring and the card download.
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
  test.beforeEach(async ({ context }) => {
    // Clipboard read/write so the copy-link assertion can verify the value.
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  });

  test("copy link writes the URL to the clipboard", async ({ page }) => {
    await page.goto(REVIEW_PATH);
    await page.getByTestId("action-copy-link").click();
    await expect(page.getByTestId("action-ephemeral")).toBeVisible();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain(`#${ENCODED_HASH}`);
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
