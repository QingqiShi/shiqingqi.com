#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { cleanStaleFiles, writeFileSyncIfChanged } from "@tuja/codegen-fs";
import * as prettier from "prettier";
import { collectComponentEntries } from "../collect-component-entries.ts";
import { collectPropsDocs, createPropsProgram } from "../collect-props-docs.ts";
import type { PropsDoc } from "../types.ts";
import { catalogue } from "./catalogue.ts";
import { extractExamples } from "./extract-examples.ts";
import { readPrimitiveMembers } from "./read-primitive-members.ts";
import { renderAgentIndex } from "./render-agent-index.ts";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const uiPackageDir = path.join(repoRoot, "packages", "ui");
const primitivesDir = path.join(uiPackageDir, "src", "primitives");
const outputDir = path.join(
  repoRoot,
  ".claude",
  "skills",
  "styling",
  "references",
);

function collectDocs(): Map<string, PropsDoc> {
  const entries = collectComponentEntries(uiPackageDir);
  const program = createPropsProgram(
    entries.map((entry) => entry.file),
    uiPackageDir,
  );
  return collectPropsDocs(program, entries, repoRoot);
}

function readPrimitives(): Map<string, string[]> {
  const members = new Map<string, string[]>();
  for (const group of catalogue) {
    for (const primitive of group.primitives ?? []) {
      const source = fs.readFileSync(
        path.join(primitivesDir, `${primitive.file}.stylex.ts`),
        "utf8",
      );
      members.set(primitive.name, readPrimitiveMembers(source, primitive.name));
    }
  }
  return members;
}

const index = renderAgentIndex({
  docs: collectDocs(),
  catalogue,
  examples: extractExamples(
    fs.readFileSync(path.join(import.meta.dirname, "examples.tsx"), "utf8"),
  ),
  primitiveMembers: readPrimitives(),
});

fs.mkdirSync(path.join(outputDir, "components"), { recursive: true });
const written: string[] = [];
const keep = new Set<string>();
for (const [relativePath, markdown] of index.files) {
  const filePath = path.join(outputDir, relativePath);
  const options = await prettier.resolveConfig(filePath);
  const formatted = await prettier.format(markdown, {
    ...options,
    filepath: filePath,
  });
  if (writeFileSyncIfChanged(filePath, formatted)) written.push(relativePath);
  if (relativePath.startsWith("components/")) {
    keep.add(path.basename(relativePath));
  }
}
const removed = cleanStaleFiles(path.join(outputDir, "components"), keep);

console.log(
  `Indexed ${String(index.files.size)} agent reference files in ${outputDir}`,
);
if (written.length > 0) console.log(`  Updated: ${written.join(", ")}`);
if (removed.length > 0) {
  console.log(`  Removed stale files: ${removed.join(", ")}`);
}
const catalogueFile = "packages/props-codegen/src/agent-index/catalogue.ts";
if (index.unlisted.length > 0) {
  console.warn(
    `  Warning: ${index.unlisted.join(", ")} not in any group of ${catalogueFile}, so listed under "Other".`,
  );
}
if (index.unknown.length > 0) {
  console.warn(
    `  Warning: ${catalogueFile} lists ${index.unknown.join(", ")}, which @tuja/ui does not export.`,
  );
}
if (index.unusedExamples.length > 0) {
  console.warn(
    `  Warning: examples.tsx has examples for ${index.unusedExamples.join(", ")}, which no listed component is named.`,
  );
}
