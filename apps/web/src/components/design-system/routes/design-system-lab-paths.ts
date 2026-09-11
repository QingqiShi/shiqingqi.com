import { DESIGN_SYSTEM_ROUTES } from "./design-system-routes.ts";

/**
 * The Lab route of every route that registers one. Plain strings, like
 * `DESIGN_SYSTEM_PATHS`, so the sitemap coverage check reads them without the
 * i18n runtime.
 */
export const DESIGN_SYSTEM_LAB_PATHS: readonly string[] =
  DESIGN_SYSTEM_ROUTES.filter((route) => route.lab === true).map(
    (route) => `${route.path}/lab`,
  );
