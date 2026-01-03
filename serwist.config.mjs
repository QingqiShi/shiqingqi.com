import { serwist } from "@serwist/next/config";

export default await serwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  globIgnores: ["**/_global-error*"],
});
