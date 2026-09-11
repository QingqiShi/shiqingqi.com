import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DESIGN_SYSTEM_ROUTES } from "../routes/design-system-routes.ts";

// src/components/design-system/lab → src/app/[locale]
const appDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../app/[locale]",
);

// The overview is the section's root, so its layout is the section's shell.
const entries = DESIGN_SYSTEM_ROUTES.filter(
  (route) => route.section !== "overview",
).map((route) => ({ path: route.path, lab: route.lab === true }));

// A route's two views are sibling routes, and only a layout between them
// keeps the header mounted across the switch: without one the switch remounts
// instead of sliding, and `DocPage` renders the article itself. A layout on a
// route without a Lab would set a second article and header inside the first.
describe("a route's layout", () => {
  it("is checked on at least one route with a Lab", () => {
    expect(entries.some((entry) => entry.lab)).toBe(true);
  });

  it.each(entries)(
    "$path has one exactly when it has a Lab",
    ({ path: routePath, lab }) => {
      expect(existsSync(path.join(appDir, routePath, "layout.tsx"))).toBe(lab);
      expect(existsSync(path.join(appDir, routePath, "lab/page.tsx"))).toBe(
        lab,
      );
    },
  );
});
