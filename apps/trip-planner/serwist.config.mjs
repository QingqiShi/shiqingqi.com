import { serwist } from "@serwist/next/config";

export default await serwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  // Trip pages are force-dynamic, so there is no prerendered HTML worth
  // precaching except the /~offline fallback document, which must be in the
  // precache for the service worker to serve it on uncached navigations.
  precachePrerendered: true,
});
