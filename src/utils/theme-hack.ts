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
            meta.setAttribute("content", "#000000");
        } else if (theme === "light") {
            document.documentElement.className = "${lightClassName}";
            meta.setAttribute("content", "#ffffff");
        } else {
            document.documentElement.className = "${systemClassName}";
            const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            meta.setAttribute("content", isDark ? "#000000" : "#ffffff");
        }
        document.head.appendChild(meta);
    }catch(t){}
})();`;
