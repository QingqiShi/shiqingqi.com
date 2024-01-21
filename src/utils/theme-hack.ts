import { getDocumentClassName } from "../app/globalStyles";

const darkClassName = getDocumentClassName("dark");
const lightClassName = getDocumentClassName("light");
const systemClassName = getDocumentClassName(null);

export const themeHack = `(function(){
    try{
        const theme = localStorage.getItem("theme");
        if (theme === "dark") {
            document.documentElement.className = "${darkClassName}";
        } else if (theme === "light") {
            document.documentElement.className = "${lightClassName}";
        } else {
            document.documentElement.className = "${systemClassName}";
        }
    }catch(t){}
})();`;
