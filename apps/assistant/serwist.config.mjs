import { serwist } from "@serwist/next/config";

export default await serwist({
  swSrc: "src/pwa/sw.ts",
  swDest: "public/sw.js",
  precachePrerendered: false,
});
