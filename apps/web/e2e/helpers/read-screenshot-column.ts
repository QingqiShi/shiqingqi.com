import type { Page } from "@playwright/test";

/** The colour of every row of one column of a screenshot, as `r,g,b`. */
export async function readScreenshotColumn(page: Page, x: number) {
  const png = await page.screenshot();
  return page.evaluate(
    async ({ base64, x }) => {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const bitmap = await createImageBitmap(
        new Blob([bytes], { type: "image/png" }),
      );
      const canvas = new OffscreenCanvas(1, bitmap.height);
      const context = canvas.getContext("2d");
      context?.drawImage(bitmap, -x, 0);
      const data = context?.getImageData(0, 0, 1, bitmap.height).data ?? [];
      return Array.from({ length: bitmap.height }, (_, row) =>
        Array.from(data.slice(row * 4, row * 4 + 3)).join(","),
      );
    },
    { base64: png.toString("base64"), x },
  );
}
