import { gray } from "@tuja/ui/palette/gray.stylex";
import { FINANCE_PATH } from "#src/finance/theme/finance-theme.ts";
import { getDocumentClassName } from "./global-styles.ts";

const classNames = (pathname: string | null) =>
  JSON.stringify({
    dark: getDocumentClassName("dark", pathname),
    light: getDocumentClassName("light", pathname),
    system: getDocumentClassName(null, pathname),
  });

// Keep the mobile browser-chrome tint in lockstep with `color.bgCanvas`
// (see tokens.stylex.ts): light canvas is `gray._97`, dark is `gray._0`.
// `gray` is a `defineConsts` palette, so these bake in as literal hex here
// and cannot drift from the canvas background.
const darkThemeColor = gray._0;
const lightThemeColor = gray._97;

/** Lets `ThemeApplier` find and remove the pre-paint tag once it renders its own. */
export const prePaintThemeColorId = "pre-paint-theme-color";

/**
 * This is a inline script hack we use to set the initial theme of the page to avoid flash of incorrect
 * theme.
 */
export const themeHack = `(function(){
    try{
        const theme = localStorage.getItem("theme");
        const classNames = /${FINANCE_PATH.source}/.test(window.location.pathname)
            ? ${classNames("/finance")}
            : ${classNames(null)};
        const meta = document.createElement("meta");
        meta.setAttribute("id", "${prePaintThemeColorId}");
        meta.setAttribute("name", "theme-color");
        if (theme === "dark") {
            document.documentElement.className = classNames.dark;
            meta.setAttribute("content", "${darkThemeColor}");
        } else if (theme === "light") {
            document.documentElement.className = classNames.light;
            meta.setAttribute("content", "${lightThemeColor}");
        } else {
            document.documentElement.className = classNames.system;
            const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            meta.setAttribute("content", isDark ? "${darkThemeColor}" : "${lightThemeColor}");
        }
        document.head.appendChild(meta);
    }catch(t){}
})();`;
