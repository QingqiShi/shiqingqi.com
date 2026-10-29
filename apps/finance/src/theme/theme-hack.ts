import { gray } from "@tuja/ui/palette/gray.stylex";
import { FINANCE_LIGHT_CANVAS } from "#src/finance/theme/finance-theme.ts";
import { getDocumentClassName } from "./global-styles.ts";

interface ThemeColor {
  /** The media query where the colour applies, or none for everywhere else. */
  media?: string;
  dark: string;
  light: string;
}

/**
 * The mobile browser-chrome tint, as `<meta name="theme-color">` tags in
 * order: the first that matches wins. It is the colour at the top edge of the
 * page: `color.bgSurfaceSunken` where an island fills the screen, and
 * `color.bgCanvas` of `financeTheme` elsewhere. `gray` is a `defineConsts`
 * palette, so these bake in as literal hex in `themeHack`.
 */
export const themeColors: ThemeColor[] = [
  { media: "(width < 768px)", dark: gray._2, light: gray._98 },
  { dark: gray._0, light: FINANCE_LIGHT_CANVAS },
];

/** Marks the tags of `themeHack`, so that `ThemeApplier` removes them once it renders its own. */
export const prePaintThemeColorAttribute = "data-pre-paint-theme-color";

const classNames = JSON.stringify({
  dark: getDocumentClassName("dark"),
  light: getDocumentClassName("light"),
  system: getDocumentClassName(null),
});

/**
 * Runs before the first paint, so the page does not flash in the wrong theme
 * before hydration.
 */
export const themeHack = `(function(){
    try{
        const theme = localStorage.getItem("theme");
        const classNames = ${classNames};
        const themeColors = ${JSON.stringify(themeColors)};
        document.documentElement.className =
            theme === "dark" ? classNames.dark : theme === "light" ? classNames.light : classNames.system;
        const isDark = theme === "dark" ||
            (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        for (const themeColor of themeColors) {
            const meta = document.createElement("meta");
            meta.setAttribute("${prePaintThemeColorAttribute}", "");
            meta.setAttribute("name", "theme-color");
            if (themeColor.media) meta.setAttribute("media", themeColor.media);
            meta.setAttribute("content", isDark ? themeColor.dark : themeColor.light);
            document.head.appendChild(meta);
        }
    }catch(t){}
})();`;
