import type { Page } from "@playwright/test";
import { DESIGN_SYSTEM_PATHS } from "../../src/design-system/routes/design-system-paths.ts";
import { PRODUCT_ROUTES } from "./product-routes.ts";

export interface AuditRoute {
  name: string;
  path: string;
  /** An element that shows the route has rendered. */
  ready: string;
  /** Opens a state that the route does not show on load. */
  open?: (page: Page) => Promise<unknown>;
}

/**
 * Every design-system page and product route, and the states of them that a
 * visit alone does not show. The design-system audits check each one.
 */
export const AUDIT_ROUTES: AuditRoute[] = [
  ...DESIGN_SYSTEM_PATHS.map((path) => ({
    name: path,
    path,
    ready: "main h1",
  })),
  ...PRODUCT_ROUTES.map(({ path, ready }) => ({ name: path, path, ready })),
  {
    name: "creature wizard",
    path: "/pixel-creature-creator/create",
    ready: '[data-testid="wizard-next"]',
  },
  {
    name: "creature review",
    path: "/pixel-creature-creator",
    ready: "h1",
    open: async (page) => {
      await page.locator('a[data-testid^="featured-"]').first().click();
      await page.getByTestId("review-screen").waitFor();
    },
  },
  {
    name: "taste preferences",
    path: "/movie-database",
    ready: "main",
    open: (page) => page.getByRole("button", { name: "Preferences" }).click(),
  },
];
