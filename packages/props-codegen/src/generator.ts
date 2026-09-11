#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { generatePropsDocs } from "./generate-props-docs.ts";

const { values } = parseArgs({
  options: { root: { type: "string" }, watch: { type: "boolean" } },
  strict: false,
});

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const projectRoot =
  typeof values.root === "string"
    ? path.resolve(values.root)
    : path.join(repoRoot, "apps", "web");
const uiPackageDir = path.join(repoRoot, "packages", "ui");
const uiComponentsDir = path.join(uiPackageDir, "src", "components");
const outputDir = path.join(projectRoot, "src", "_generated", "props");

function main(): void {
  const result = generatePropsDocs({ repoRoot, uiPackageDir, outputDir });
  const propCount = [...result.docs.values()].reduce(
    (total, doc) => total + doc.props.length,
    0,
  );
  console.log(
    `Documented ${String(result.docs.size)} components (${String(propCount)} props) in ${outputDir}`,
  );
  if (result.written.length > 0) {
    console.log(`  Updated: ${result.written.join(", ")}`);
  }
  if (result.removed.length > 0) {
    console.log(`  Removed stale files: ${result.removed.join(", ")}`);
  }
}

main();

if (values.watch === true) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  console.log("\nWatching for changes in packages/ui/src/components...");

  fs.watch(uiComponentsDir, { recursive: true }, (_event, filename) => {
    if (filename === null || !/\.tsx?$/.test(filename)) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`\nChange detected: ${filename}`);
      try {
        main();
      } catch (error) {
        console.error(`\nCodegen error: ${String(error)}`);
      }
    }, 100);
  });
}
