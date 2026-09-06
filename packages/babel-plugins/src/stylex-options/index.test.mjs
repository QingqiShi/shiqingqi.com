import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { stylexPluginOptions } = require("./index");

describe("stylexPluginOptions", () => {
  it("turns on dev mode only for a development build", () => {
    expect(
      stylexPluginOptions({ rootDir: "/repo", nodeEnv: "development" }),
    ).toMatchObject({ dev: true, test: false });
    expect(
      stylexPluginOptions({ rootDir: "/repo", nodeEnv: "test" }),
    ).toMatchObject({ dev: false, test: true });
  });
});
