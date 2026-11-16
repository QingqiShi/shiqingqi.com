import { transformSync } from "@babel/core";
import { describe, expect, it } from "vitest";
import inlineEsmEnv from "./index.js";

function transform(code, dev) {
  return transformSync(code, {
    configFile: false,
    babelrc: false,
    plugins: [[inlineEsmEnv, { dev }]],
  }).code;
}

describe("inline-esm-env", () => {
  it("replaces DEV with the literal and removes the import", () => {
    const code = transform(
      'import { DEV } from "esm-env";\nif (DEV) warn();\nconst on = !DEV;',
      false,
    );
    expect(code).not.toContain("esm-env");
    expect(code).toContain("if (false) warn();");
    expect(code).toContain("const on = !false;");
  });

  it("uses true in a development build", () => {
    expect(transform('import { DEV } from "esm-env";\nlog(DEV);', true)).toBe(
      "log(true);",
    );
  });

  it("keeps the other exports of esm-env and an unrelated DEV", () => {
    const code = transform(
      'import { BROWSER, DEV as isDev } from "esm-env";\nimport { DEV } from "./local";\nlog(BROWSER, isDev, DEV);',
      false,
    );
    expect(code).toContain('import { BROWSER } from "esm-env";');
    expect(code).toContain("log(BROWSER, false, DEV);");
  });
});
