import { describe, expect, it } from "vitest";
import { atomicClasses } from "../test-support/atomic-classes.ts";

const typeFile = "primitives/type.stylex.ts";

const headingRoles = [
  "display",
  "subDisplay",
  "h1",
  "h2",
  "h3",
  "h4",
  "fluidDisplay",
  "fluidH1",
  "fluidH2",
  "fluidH3",
  "cardTitle",
];

const textRoles = [
  "body",
  "bodySmall",
  "label",
  "caption",
  "overline",
  "control",
  "controlCaption",
  "fluidLead",
];

// The compiled style keys each property by a hash, so the test compiles the
// declaration it expects and looks for that key and class.
const [[textWrapKey, balance]] = atomicClasses(
  "primitives/wrap-reference.stylex.ts",
  "reference",
  "balance",
  `import * as stylex from "@stylexjs/stylex";
export const reference = stylex.create({ balance: { textWrap: "balance" } });`,
);

describe("type role wrapping", () => {
  it.each(headingRoles)("typeRole.%s balances its lines", (role) => {
    expect(atomicClasses(typeFile, "typeRole", role).get(textWrapKey)).toBe(
      balance,
    );
  });

  it.each(textRoles)(
    "typeRole.%s keeps the root's text-wrap: pretty",
    (role) => {
      const classes = atomicClasses(typeFile, "typeRole", role);
      expect(classes.size).toBeGreaterThan(0);
      expect(classes.has(textWrapKey)).toBe(false);
    },
  );
});
