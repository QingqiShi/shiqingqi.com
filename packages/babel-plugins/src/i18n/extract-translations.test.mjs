import { types } from "@babel/core";
import { parseExpression } from "@babel/parser";
import { describe, expect, it } from "vitest";

import { extractTranslations } from "./extract-translations";

/** @param {string} source */
function extract(source) {
  return extractTranslations(types, parseExpression(source));
}

describe("extractTranslations", () => {
  it.each([
    `{ en: "Hello", zh: "你好" }`,
    `{ "en": "Hello", "zh": "你好" }`,
    `{ ["en"]: "Hello", ["zh"]: "你好" }`,
  ])("reads the pair from %s", (source) => {
    expect(extract(source)).toEqual({ en: "Hello", zh: "你好" });
  });

  it.each([
    `"Hello"`,
    `translations`,
    `{ zh: "你好" }`,
    `{ en: "Hello" }`,
    `{ en: greeting, zh: "你好" }`,
    `{ en: \`Hello\`, zh: "你好" }`,
    `{ [en]: "Hello", [zh]: "你好" }`,
    `{ en() { return "Hello"; }, zh: "你好" }`,
  ])("rejects %s", (source) => {
    expect(extract(source)).toBeNull();
  });
});
