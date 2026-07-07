import { gray } from "@tuja/ui/palette/gray";
import { getDocumentClassName } from "#src/app/global-styles.ts";

const darkClassName = getDocumentClassName("dark");
const lightClassName = getDocumentClassName("light");
const systemClassName = getDocumentClassName(null);

// Keep the mobile browser-chrome tint in lockstep with `color.bgCanvas`
// (see tokens.stylex.ts): light canvas is `gray._97`, dark is `gray._0`.
// `gray` is a `defineConsts` palette, so these bake in as literal hex here
// and cannot drift from the canvas background.
const darkThemeColor = gray._0;
const lightThemeColor = gray._97;

/**
 * This is a inline script hack we use to set the initial theme of the page to avoid flash of incorrect
 * theme.
 */
export const themeHack = `(function(){
    try{
        const theme = localStorage.getItem("theme");
        const meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        if (theme === "dark") {
            document.documentElement.className = "${darkClassName}";
            meta.setAttribute("content", "${darkThemeColor}");
        } else if (theme === "light") {
            document.documentElement.className = "${lightClassName}";
            meta.setAttribute("content", "${lightThemeColor}");
        } else {
            document.documentElement.className = "${systemClassName}";
            const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            meta.setAttribute("content", isDark ? "${darkThemeColor}" : "${lightThemeColor}");
        }
        document.head.appendChild(meta);
    }catch(t){}
})();`;
