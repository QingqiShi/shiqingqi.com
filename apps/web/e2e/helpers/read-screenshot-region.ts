import type { Page } from "@playwright/test";

/** The rows of a region of a screenshot, each pixel as `[r, g, b]`. */
export async function readScreenshotRegion(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
) {
  const png = await page.screenshot({ clip });
  return page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const bitmap = await createImageBitmap(
      new Blob([bytes], { type: "image/png" }),
    );
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    context?.drawImage(bitmap, 0, 0);
    const data =
      context?.getImageData(0, 0, bitmap.width, bitmap.height).data ?? [];
    return Array.from({ length: bitmap.height }, (_, row) =>
      Array.from({ length: bitmap.width }, (_, column) => {
        const at = (row * bitmap.width + column) * 4;
        return [data[at], data[at + 1], data[at + 2]];
      }),
    );
  }, png.toString("base64"));
}
