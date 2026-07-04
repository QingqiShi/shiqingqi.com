import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BASE_URL } from "#src/constants.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
import { DESIGN_SYSTEM_PATHS } from "./routes.ts";

// Resolve the static sitemap relative to this file so the test is independent
// of the working directory. src/components/design-system → src/app.
const here = path.dirname(fileURLToPath(import.meta.url));
const sitemap = readFileSync(
  path.resolve(here, "../../app/sitemap.xml"),
  "utf8",
);

const locales: SupportedLocale[] = ["en", "zh"];

describe("design-system sitemap coverage", () => {
  it("has routes registered", () => {
    expect(DESIGN_SYSTEM_PATHS.length).toBeGreaterThan(0);
  });

  it.each([...DESIGN_SYSTEM_PATHS])(
    "lists %s in the sitemap for both locales",
    (routePath) => {
      for (const locale of locales) {
        const url = new URL(
          getLocalePath(routePath, locale),
          BASE_URL,
        ).toString();
        expect(sitemap).toContain(`<loc>${url}</loc>`);
      }
    },
  );
});
