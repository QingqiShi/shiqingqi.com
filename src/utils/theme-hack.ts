import { getDocumentClassName } from "../app/globalStyles";

const darkClassName = getDocumentClassName("dark");
const lightClassName = getDocumentClassName("light");
const systemClassName = getDocumentClassName(null);

export const themeHack = `(function(){
    try{
        const theme = localStorage.getItem("theme");
        const meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        if (theme === "dark") {
            document.documentElement.className = "${darkClassName}";
            meta.setAttribute("content", "#292929");
        } else if (theme === "light") {
            document.documentElement.className = "${lightClassName}";
            meta.setAttribute("content", "#f3eded");
        } else {
            document.documentElement.className = "${systemClassName}";
            const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            meta.setAttribute("content", isDark ? "#292929" : "#f3eded");
        }
        document.head.appendChild(meta);
    }catch(t){}
})();`;
