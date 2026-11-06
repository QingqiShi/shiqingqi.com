import { globSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

const icons = globSync("apps/*/src/**/pwa/*-icon-*.png", { cwd: repoRoot })
  .map((file) => ({
    file,
    size: Number(/-icon-(\d+)\.png$/.exec(file)?.[1]),
  }))
  .filter(({ size }) => [16, 32, 180, 192, 512].includes(size));

async function readAlpha(file) {
  const { data, info } = await sharp(path.join(repoRoot, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alphaAt = (x, y) => data[(y * info.width + x) * 4 + 3];
  const last = info.width - 1;
  return {
    corners: [
      alphaAt(0, 0),
      alphaAt(last, 0),
      alphaAt(0, last),
      alphaAt(last, last),
    ],
    centre: alphaAt(info.width >> 1, info.height >> 1),
  };
}

it("finds the app icons", () => {
  expect(icons.length).toBeGreaterThan(0);
});

it.each(icons.filter(({ size }) => size <= 32))(
  "$file has transparent rounded corners for the browser tab",
  async ({ file }) => {
    const { corners, centre } = await readAlpha(file);
    for (const alpha of corners) {
      expect(alpha).toBeLessThan(255 * 0.1);
    }
    expect(centre).toBe(255);
  },
);

it.each(icons.filter(({ size }) => size > 32))(
  "$file is a full-bleed square for the OS to mask",
  async ({ file }) => {
    const { corners } = await readAlpha(file);
    expect(corners).toEqual([255, 255, 255, 255]);
  },
);
