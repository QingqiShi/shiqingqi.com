import { buildCatalogue } from "./build-catalogue.mjs";
import { compileDesignSystem } from "./compile-design-system.mjs";
import { fontCss } from "./font-css.mjs";
import { normalizeCss } from "./normalize-css.mjs";
import { pageResetCss } from "./page-reset-css.mjs";

/**
 * Everything the playground needs from `@tuja/ui`: the CSS the app ships for
 * the token and primitive files, the fonts, `modern-normalize`, and the token
 * catalogue the pickers read.
 */
export function buildAdapter() {
  const compiled = compileDesignSystem();
  const catalogue = buildCatalogue(compiled);
  const fonts = fontCss();

  const css = [normalizeCss(), pageResetCss(), fonts.css, compiled.css].join(
    "\n",
  );

  return { css, catalogue, fontDataUriBytes: fonts.dataUriBytes };
}
