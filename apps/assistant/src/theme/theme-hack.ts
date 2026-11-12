import { gray } from "@tuja/ui/palette/gray.stylex";
import { CANVAS_COLORS } from "./canvas-colors.ts";
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
 * page: `color.card` where an island fills the screen, and
 * `color.sidebar` where the shell shows it around the islands. `gray` is a `defineConsts`
 * palette, so these bake in as literal hex in `themeHack`.
 */
export const themeColors: ThemeColor[] = [
  { media: "(width < 34rem)", dark: gray._5, light: gray._100 },
  CANVAS_COLORS,
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
