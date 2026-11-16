import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Asks once for the document of a page that the service worker has not seen
 * load: a page reached by a link in the app, which fetches only the page's
 * data, or a page that loaded before the service worker took control. The
 * service worker keeps each document that it fetches, so without this a
 * reload with no network would find no copy of the page.
 */
export function useKeepPageOffline() {
  const pathname = usePathname();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const { serviceWorker } = navigator;
    const keep = () => {
      fetch(pathname, { credentials: "same-origin" }).catch(() => {
        // The page reads on without the copy. It is kept on the next visit.
      });
    };

    if (!serviceWorker.controller) {
      serviceWorker.addEventListener("controllerchange", keep, { once: true });
      return () => {
        serviceWorker.removeEventListener("controllerchange", keep);
      };
    }
    const loaded = performance.getEntriesByType("navigation").at(0);
    if (loaded && new URL(loaded.name).pathname === pathname) return;
    keep();
  }, [pathname]);
}
