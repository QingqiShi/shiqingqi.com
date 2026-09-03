import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./require-package-export");

/** @type {Map<string, string>} */
const packageDirByManifest = new Map();

/**
 * Build a throwaway package on disk so a rule can walk up to a real
 * package.json, and return the absolute path of a file inside it. Identical
 * manifests share one directory, so cases can name the same package.
 */
function makePackage(manifest, relativeFile) {
  const key = JSON.stringify(manifest);
  let packageDir = packageDirByManifest.get(key);
  if (packageDir === undefined) {
    packageDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "design-system-")),
    );
    fs.writeFileSync(path.join(packageDir, "package.json"), key);
    packageDirByManifest.set(key, packageDir);
  }
  return path.join(packageDir, relativeFile);
}

const MERGE_REFS = "src/utils/merge-refs.ts";

const BUTTON_EXPORTS = {
  exports: { "./button": "./src/components/button.tsx" },
};

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("require-package-export", rule, {
  valid: [
    // V1: an exact exports target
    {
      code: `export const a = 1;`,
      filename: makePackage(BUTTON_EXPORTS, "src/components/button.tsx"),
    },
    // V2: a wildcard exports target
    {
      code: `export const blue = 1;`,
      filename: makePackage(
        { exports: { "./palette/*": "./src/palette/hues/*.stylex.ts" } },
        "src/palette/hues/blue.stylex.ts",
      ),
    },
    // V3: no exports map, so the package makes no promise to keep
    {
      code: `export const a = 1;`,
      filename: makePackage({ name: "no-exports" }, "src/internal.ts"),
    },
    // V4: no filename to resolve against
    { code: `export const a = 1;` },
    // V5: an unreachable export that says why it stays internal
    {
      code: `/** Merges refs.\n * @internal\n */\nexport function mergeRefs() {}`,
      filename: makePackage(BUTTON_EXPORTS, "src/utils/merge-refs.ts"),
    },
    // V6: the module opens with a `"use client"` directive
    {
      code: `"use client";\nimport { a } from "a";\n/** @internal */\nexport function HeaderControls() { return a; }`,
      filename: makePackage(
        BUTTON_EXPORTS,
        "src/components/header-controls.tsx",
      ),
    },
    // V7: a public module documents one of its exports `@internal`, which is
    // ordinary TSDoc rather than a claim about the module
    {
      code: `/** @internal */\nexport const a = 1;\nexport const b = 2;`,
      filename: makePackage(BUTTON_EXPORTS, "src/components/button.tsx"),
    },
    // V8: nothing is exported, so the exports map has nothing to reach
    {
      code: `const a = 1;\nconsole.log(a);`,
      filename: makePackage(BUTTON_EXPORTS, "src/utils/side-effect.ts"),
    },
    // V9: `export {}` only marks the file a module
    {
      code: `export {};`,
      filename: makePackage(BUTTON_EXPORTS, "src/utils/marker.ts"),
    },
    // V10: a conditional target reaches the file under one of its conditions
    {
      code: `export const a = 1;`,
      filename: makePackage(
        {
          exports: {
            "./button": {
              types: "./src/components/button.d.ts",
              default: "./src/components/button.tsx",
            },
          },
        },
        "src/components/button.tsx",
      ),
    },
  ],

  invalid: [
    // I1: an export the exports map does not reach
    {
      code: `export const a = 1;`,
      filename: makePackage(BUTTON_EXPORTS, "src/utils/merge-refs.ts"),
      errors: [
        {
          messageId: "notExported",
          data: { file: MERGE_REFS },
        },
      ],
    },
    // I2: one report per untagged export
    {
      code: `export function a() {}\nexport default 1;`,
      filename: makePackage(BUTTON_EXPORTS, "src/utils/merge-refs.ts"),
      errors: [
        {
          messageId: "notExported",
          data: { file: MERGE_REFS },
        },
        {
          messageId: "notExported",
          data: { file: MERGE_REFS },
        },
      ],
    },
    // I3: a tagged export beside an untagged one; only the untagged reports
    {
      code: `/** @internal */\nexport const a = 1;\nexport const b = 2;`,
      filename: makePackage(BUTTON_EXPORTS, "src/utils/merge-refs.ts"),
      errors: [
        {
          messageId: "notExported",
          data: { file: MERGE_REFS },
          line: 3,
        },
      ],
    },
    // I4: every export of a reachable module is tagged, so the module is
    // public and the tags are stale
    {
      code: `/** @internal */\nexport const a = 1;\n/** @internal */\nexport const b = 2;`,
      filename: makePackage(BUTTON_EXPORTS, "src/components/button.tsx"),
      errors: [
        {
          messageId: "staleInternal",
          data: { file: "src/components/button.tsx" },
          line: 1,
        },
      ],
    },
    // I5: a specifier list is one export statement, so one report
    {
      code: `const a = 1;\nconst b = 2;\nexport { a, b };`,
      filename: makePackage(BUTTON_EXPORTS, "src/utils/merge-refs.ts"),
      errors: [
        {
          messageId: "notExported",
          data: { file: MERGE_REFS },
        },
      ],
    },
    // I6: a re-export is an export too
    {
      code: `export * from "./focusable.ts";`,
      filename: makePackage(BUTTON_EXPORTS, "src/utils/index.ts"),
      errors: [
        {
          messageId: "notExported",
          data: { file: "src/utils/index.ts" },
        },
      ],
    },
    // I7: `@internal` has to be the whole tag
    {
      code: `/** @internalFoo Not the tag. */\nexport const a = 1;`,
      filename: makePackage(BUTTON_EXPORTS, "src/utils/merge-refs.ts"),
      errors: [{ messageId: "notExported" }],
    },
    // I8: TSDoc is a block comment, so a line comment carries no tag
    {
      code: `// @internal Not TSDoc.\nexport const a = 1;`,
      filename: makePackage(BUTTON_EXPORTS, "src/utils/merge-refs.ts"),
      errors: [{ messageId: "notExported" }],
    },
    // I9: a wildcard the file matches the prefix but not the suffix of
    {
      code: `export const a = 1;`,
      filename: makePackage(
        { exports: { "./palette/*": "./src/palette/hues/*.stylex.ts" } },
        "src/palette/hues/notes.md.ts",
      ),
      errors: [{ messageId: "notExported" }],
    },
  ],
});
