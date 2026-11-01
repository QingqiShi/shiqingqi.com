import { test as base, expect } from "@playwright/test";

export { expect };

/**
 * Playwright's `test`, failing each test whose pages warn that a Scroll mask
 * stops short of its container's edge. The e2e build turns that check on
 * with `NEXT_PUBLIC_UI_DEV_CHECKS`.
 */
export const test = base.extend<{ scrollMaskFlush: undefined }>({
  scrollMaskFlush: [
    async ({ context }, provide) => {
      const warnings: string[] = [];
      context.on("console", (message) => {
        if (
          message.type() === "warning" &&
          message.text().startsWith("[scroll mask]")
        ) {
          warnings.push(message.text());
        }
      });
      await provide(undefined);
      expect(warnings, "No Scroll mask stops short of its container").toEqual(
        [],
      );
    },
    { auto: true },
  ],
});
