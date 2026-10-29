import { gray } from "@tuja/ui/palette/gray.stylex";
import { getDocumentClassName } from "./global-styles.ts";

/**
 * The mobile browser-chrome tint: `color.bgCanvas`. `gray` is a
 * `defineConsts` palette, so the values bake into `themeHack` as hex.
 */
export const themeColors = { dark: gray._0, light: gray._97 };

/** Marks the tag of `themeHack`, so that `ThemeApplier` removes it once it renders its own. */
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
        document.documentElement.className =
            theme === "dark" ? classNames.dark : theme === "light" ? classNames.light : classNames.system;
        const isDark = theme === "dark" ||
            (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        const meta = document.createElement("meta");
        meta.setAttribute("${prePaintThemeColorAttribute}", "");
        meta.setAttribute("name", "theme-color");
        meta.setAttribute("content", isDark ? "${themeColors.dark}" : "${themeColors.light}");
        document.head.appendChild(meta);
    }catch(t){}
})();`;
