import { describe, expect, it } from "vitest";

import { isI18nModuleSource } from "./is-i18n-module-source";

describe("isI18nModuleSource", () => {
  it.each(["#src/i18n", "#src/i18n.ts", "../../i18n", "../../i18n.ts"])(
    "accepts %s",
    (source) => {
      expect(isI18nModuleSource(source)).toBe(true);
    },
  );

  it.each([
    "i18n",
    "#src/i18n/server-runtime.ts",
    "#src/i18n.tsx",
    "#src/my-i18n",
    "other-lib",
    null,
  ])("rejects %s", (source) => {
    expect(isI18nModuleSource(source)).toBe(false);
  });
});
