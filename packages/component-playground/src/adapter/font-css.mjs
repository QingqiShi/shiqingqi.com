import fs from "node:fs";
import path from "node:path";
import { webRoot } from "./design-system-sources.mjs";

const UNICODE_RANGE = [
  "U+0000, U+0020-007E, U+00A0-00AC, U+00AE-00FF, U+0131, U+0152-0153,",
  "U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-200B, U+2010-2027, U+202F-2055,",
  "U+2057, U+205F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+FEFF",
].join("\n    ");

/** The app's `@font-face` rules, with the Inter file inlined. */
export function fontCss() {
  const file = path.join(webRoot, "public/InterVariableOptimized.woff2");
  const bytes = fs.readFileSync(file);
  const dataUri = `data:font/woff2;base64,${bytes.toString("base64")}`;
  const css = `@font-face {
  font-family: "Inter";
  src: url("${dataUri}");
  font-style: oblique 0deg 10deg;
  font-weight: 100 900;
  font-display: fallback;
  unicode-range:
    ${UNICODE_RANGE};
}

@font-face {
  font-family: "Inter-fallback";
  size-adjust: 107%;
  ascent-override: 90%;
  src:
    local("Segoe UI"), local("Roboto"), local("Helvetica Neue"),
    local("Helvetica"), local("Arial");
  unicode-range:
    ${UNICODE_RANGE};
}
`;
  return { css, dataUriBytes: dataUri.length };
}
