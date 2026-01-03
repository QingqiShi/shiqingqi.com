import { serwist } from "@serwist/next/config";

export default await serwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  // HTML pages are runtime-cached as users browse (RSC payloads for client-side nav)
  // Precaching HTML has limited value since client-side navigation uses RSC, not HTML
  precachePrerendered: false,
  globIgnores: [
    "**/_global-error*",
    "**/pwa-*.png",
    "**/vercel.svg",
    "**/next.svg",
  ],
});
