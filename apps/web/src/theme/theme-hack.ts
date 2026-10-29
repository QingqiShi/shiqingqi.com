import { gray } from "@tuja/ui/palette/gray.stylex";
import { getDocumentClassName } from "./global-styles.ts";

const classNames = JSON.stringify({
  dark: getDocumentClassName("dark"),
  light: getDocumentClassName("light"),
  system: getDocumentClassName(null),
});

/**
 * The mobile browser-chrome tint: the colour at the top edge of the page,
 * `color.bgCanvas`. `gray` is a `defineConsts` palette, so these bake in as
 * literal hex in `themeHack`.
 */
export const themeColors = { dark: gray._0, light: gray._97 };

/** Marks the tag of `themeHack`, so that `ThemeApplier` removes it once it renders its own. */
export const prePaintThemeColorAttribute = "data-pre-paint-theme-color";

/**
 * This is a inline script hack we use to set the initial theme of the page to avoid flash of incorrect
 * theme.
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
