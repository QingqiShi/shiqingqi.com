import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "@babel/core";
import type { Rule } from "@stylexjs/babel-plugin";
import stylexBabelPlugin from "@stylexjs/babel-plugin";

const require = createRequire(import.meta.url);
const typescriptPreset = require.resolve("@babel/preset-typescript");

function findWorkspaceRoot(): string {
  let directory = path.dirname(fileURLToPath(import.meta.url));
  while (!fs.existsSync(path.join(directory, "pnpm-workspace.yaml"))) {
    const parent = path.dirname(directory);
    if (parent === directory) {
      throw new Error(
        "Found no pnpm-workspace.yaml above @tuja/stylex-testing",
      );
    }
    directory = parent;
  }
  return directory;
}

// A token's var name is hashed from its module path relative to this root, so
// the root has to be the one the app builds with or the names do not match.
const workspaceRoot = findWorkspaceRoot();

function isStylexRules(value: unknown): value is Rule[] {
  return Array.isArray(value);
}

function compileRules(file: string): Rule[] {
  const result = transformSync(fs.readFileSync(file, "utf8"), {
    filename: file,
    babelrc: false,
    configFile: false,
    presets: [typescriptPreset],
    plugins: [
      stylexBabelPlugin.withOptions({
        dev: false,
        runtimeInjection: false,
        styleResolution: "property-specificity",
        unstable_moduleResolution: {
          type: "commonJS",
          rootDir: workspaceRoot,
        },
      }),
    ],
  });
  const rules: unknown = result?.metadata.stylex;
  if (!isStylexRules(rules)) {
    throw new Error(`StyleX collected no rules from ${file}`);
  }
  return rules;
}

const cssByFileList = new Map<string, string>();

/**
 * Compiles the given `.stylex.ts` modules the way the build does and returns
 * the CSS they produce, so a test measures what ships. Memoised by file list.
 */
export function compileStylexCss(files: readonly string[]): string {
  const sorted = [...files].sort((a, b) => a.localeCompare(b));
  const key = sorted.join("\n");
  const cached = cssByFileList.get(key);
  if (cached !== undefined) return cached;

  const css = stylexBabelPlugin.processStylexRules(
    sorted.flatMap((file) => compileRules(file)),
    false,
  );
  cssByFileList.set(key, css);
  return css;
}
