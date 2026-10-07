import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSync, transformSync, types } from "@babel/core";
import { stylexPlugins } from "@tuja/babel-plugins/stylex-plugins";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, "../..");
const workspaceRoot = path.resolve(packageRoot, "../..");

// The test build of StyleX emits debug class names only, so this compiles the
// module the way the production build does. An atomic class name is a hash of
// one declaration, so two styles that carry the same ring carry the same
// class names.
function atomicClasses(file: string, namespace: string, style: string) {
  const filename = path.resolve(here, file);
  const code = transformSync(fs.readFileSync(filename, "utf8"), {
    filename,
    babelrc: false,
    configFile: false,
    presets: ["@babel/preset-typescript"],
    plugins: stylexPlugins({
      rootDir: workspaceRoot,
      breakpointsRootDir: packageRoot,
      nodeEnv: undefined,
    }),
  })?.code;
  const program = parseSync(code ?? "", {
    babelrc: false,
    configFile: false,
  })?.program;
  const classes = new Map<string, string>();
  for (const statement of program?.body ?? []) {
    if (!types.isExportNamedDeclaration(statement)) continue;
    if (!types.isVariableDeclaration(statement.declaration)) continue;
    for (const declarator of statement.declaration.declarations) {
      if (!types.isIdentifier(declarator.id, { name: namespace })) continue;
      if (!types.isObjectExpression(declarator.init)) continue;
      const styleObject = declarator.init.properties.find(
        (property) =>
          types.isObjectProperty(property) &&
          types.isIdentifier(property.key, { name: style }),
      );
      if (!types.isObjectProperty(styleObject)) continue;
      if (!types.isObjectExpression(styleObject.value)) continue;
      for (const property of styleObject.value.properties) {
        if (
          types.isObjectProperty(property) &&
          types.isIdentifier(property.key) &&
          types.isStringLiteral(property.value)
        ) {
          classes.set(property.key.name, property.value.value);
        }
      }
    }
  }
  return classes;
}

describe("focus ring copies", () => {
  const outer = atomicClasses("./a11y.stylex.ts", "a11y", "focusRing");
  const inset = atomicClasses("./a11y.stylex.ts", "a11y", "focusRingInset");

  it("reads the a11y rings", () => {
    expect(outer.size).toBe(4);
    expect(inset.size).toBe(4);
  });

  it.each([
    ["./reset.stylex.ts", "buttonReset", "base", outer],
    ["../actions/chip.stylex.ts", "chipSurface", "interactive", outer],
    ["../surfaces/card.stylex.ts", "cardSurface", "interactive", inset],
  ])(
    "%s %s.%s carries the a11y ring unchanged",
    (file, namespace, style, ring) => {
      const classes = atomicClasses(file, namespace, style);
      for (const [property, className] of ring) {
        expect(classes.get(property)).toBe(className);
      }
    },
  );
});
