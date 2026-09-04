import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BASE_URL } from "#src/constants.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getLocalePath } from "#src/utils/get-locale-path.ts";
import { DESIGN_SYSTEM_PATHS } from "./routes/design-system-paths.ts";

// Resolve the static sitemap relative to this file so the test is independent
// of the working directory. src/components/design-system → src/app.
const here = path.dirname(fileURLToPath(import.meta.url));
const sitemap = readFileSync(
  path.resolve(here, "../../app/sitemap.xml"),
  "utf8",
);

const locales: SupportedLocale[] = ["en", "zh"];

const registeredUrls = new Set(
  DESIGN_SYSTEM_PATHS.flatMap((routePath) =>
    locales.map((locale) =>
      new URL(getLocalePath(routePath, locale), BASE_URL).toString(),
    ),
  ),
);

const sitemapDesignSystemUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((match) => match[1])
  .filter((url) => /\/design-system(\/|$)/.test(new URL(url).pathname));

describe("design-system sitemap coverage", () => {
  it("has routes registered", () => {
    expect(DESIGN_SYSTEM_PATHS.length).toBeGreaterThan(0);
  });

  it.each([...registeredUrls])("lists %s in the sitemap", (url) => {
    expect(sitemap).toContain(`<loc>${url}</loc>`);
  });

  it.each(sitemapDesignSystemUrls)(
    "%s in the sitemap is a registered route",
    (url) => {
      expect(registeredUrls).toContain(url);
    },
  );
});
