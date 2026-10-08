import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSync, transformSync, types } from "@babel/core";
import { stylexPlugins } from "@tuja/babel-plugins/stylex-plugins";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const workspaceRoot = path.resolve(packageRoot, "../..");

/**
 * Compiles a `*.stylex.ts` module, at `file` relative to `packages/ui/src`,
 * the way the production build does, and
 * returns the atomic class of each property in `namespace.style`. The test
 * build of StyleX emits debug class names only. An atomic class name is a
 * hash of one declaration, so two styles that set the same value share it.
 * Pass `source` to compile that code in place of the file's own.
 *
 * @internal
 */
export function atomicClasses(
  file: string,
  namespace: string,
  style: string,
  source?: string,
) {
  const filename = path.resolve(packageRoot, "src", file);
  const code = transformSync(source ?? fs.readFileSync(filename, "utf8"), {
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
