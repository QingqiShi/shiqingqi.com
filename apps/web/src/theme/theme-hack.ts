import { gray } from "@tuja/ui/palette/gray.stylex";
import {
  FINANCE_LIGHT_CANVAS,
  FINANCE_PATH,
  isFinancePath,
} from "#src/finance/theme/finance-theme.ts";
import { getDocumentClassName } from "./global-styles.ts";

const classNames = (pathname: string | null) =>
  JSON.stringify({
    dark: getDocumentClassName("dark", pathname),
    light: getDocumentClassName("light", pathname),
    system: getDocumentClassName(null, pathname),
  });

interface ThemeColor {
  /** The media query where the colour applies, or none for everywhere else. */
  media?: string;
  dark: string;
  light: string;
}

/**
 * The mobile browser-chrome tint of a page, as `<meta name="theme-color">`
 * tags in order: the first that matches wins. It is the colour at the top
 * edge of the page: `color.bgCanvas`, which `financeTheme` changes on a
 * Finance page, or `color.bgSurface` where a Finance island fills the
 * screen. `gray` is a `defineConsts` palette, so these bake in as literal
 * hex in `themeHack`.
 */
export function getThemeColors(pathname: string | null): ThemeColor[] {
  if (!isFinancePath(pathname)) return [{ dark: gray._0, light: gray._97 }];
  return [
    { media: "(width < 768px)", dark: gray._5, light: gray._100 },
    { dark: gray._0, light: FINANCE_LIGHT_CANVAS },
  ];
}

/** Marks the tags of `themeHack`, so that `ThemeApplier` removes them once it renders its own. */
export const prePaintThemeColorAttribute = "data-pre-paint-theme-color";

/**
 * This is a inline script hack we use to set the initial theme of the page to avoid flash of incorrect
 * theme.
 */
export const themeHack = `(function(){
    try{
        const theme = localStorage.getItem("theme");
        const isFinance = /${FINANCE_PATH.source}/.test(window.location.pathname);
        const classNames = isFinance ? ${classNames("/finance")} : ${classNames(null)};
        const themeColors = isFinance
            ? ${JSON.stringify(getThemeColors("/finance"))}
            : ${JSON.stringify(getThemeColors(null))};
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
