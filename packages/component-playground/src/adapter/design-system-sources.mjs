import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nodeRequire = createRequire(import.meta.url);

export const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export const monorepoRoot = path.resolve(packageRoot, "../..");

export const uiRoot = path.dirname(
  nodeRequire.resolve("@tuja/ui/package.json"),
);

// The Inter file is the one asset the design system does not own, so it is
// read from the app rather than through a dependency on it.
export const webRoot = path.join(monorepoRoot, "apps/web");

function hueFiles() {
  const dir = path.join(uiRoot, "src/_generated/palette/hues");
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".stylex.ts"))
    .sort()
    .map((name) => path.join(dir, name));
}

function primitiveFiles() {
  const dir = path.join(uiRoot, "src/primitives");
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".stylex.ts"))
    .sort()
    .map((name) => path.join(dir, name));
}

/**
 * Every design-system source the playground compiles, in the order the app's
 * PostCSS include globs walk them.
 */
export function designSystemSources() {
  return [
    path.join(uiRoot, "src/breakpoints.stylex.ts"),
    path.join(uiRoot, "src/tokens.stylex.ts"),
    ...hueFiles(),
    ...primitiveFiles(),
  ];
}

export const tokensFile = path.join(uiRoot, "src/tokens.stylex.ts");
export const breakpointsFile = path.join(uiRoot, "src/breakpoints.stylex.ts");
export const primitiveSources = primitiveFiles;
