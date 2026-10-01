import { DESIGN_SYSTEM_ROUTES } from "./design-system-routes.ts";
import type { DesignSystemPath } from "./types.ts";

/**
 * Every registered path as plain strings. Safe to import from tests and the
 * sitemap coverage check without the i18n runtime.
 */
export const DESIGN_SYSTEM_PATHS: readonly DesignSystemPath[] =
  DESIGN_SYSTEM_ROUTES.map((route) => route.path);
