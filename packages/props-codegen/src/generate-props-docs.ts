import fs from "node:fs";
import path from "node:path";
import { cleanStaleFiles, writeFileSyncIfChanged } from "@tuja/codegen-fs";
import { collectComponentEntries } from "./collect-component-entries.ts";
import { collectPropsDocs, createPropsProgram } from "./collect-props-docs.ts";
import { renderPropsIndex } from "./render-props-index.ts";
import type { PropsDoc } from "./types.ts";

export interface GeneratePropsDocsOptions {
  /** Repo root, used to make each document's `source` path relative. */
  repoRoot: string;
  /** The `@tuja/ui` package directory. */
  uiPackageDir: string;
  /** Where the JSON documents and the index module are written. */
  outputDir: string;
}

export interface GeneratedPropsDocs {
  docs: Map<string, PropsDoc>;
  written: string[];
  removed: string[];
}

/** Read every `@tuja/ui` component's props and write one document each. */
export function generatePropsDocs(
  options: GeneratePropsDocsOptions,
): GeneratedPropsDocs {
  const entries = collectComponentEntries(options.uiPackageDir);
  const program = createPropsProgram(
    entries.map((entry) => entry.file),
    options.uiPackageDir,
  );
  const docs = collectPropsDocs(program, entries, options.repoRoot);

  fs.mkdirSync(options.outputDir, { recursive: true });

  const written: string[] = [];
  const keep = new Set<string>(["index.ts"]);
  for (const [name, doc] of docs) {
    const filename = `${name}.json`;
    keep.add(filename);
    const changed = writeFileSyncIfChanged(
      path.join(options.outputDir, filename),
      JSON.stringify(doc, null, 2) + "\n",
    );
    if (changed) written.push(filename);
  }
  if (
    writeFileSyncIfChanged(
      path.join(options.outputDir, "index.ts"),
      renderPropsIndex([...docs.keys()]),
    )
  ) {
    written.push("index.ts");
  }

  return {
    docs,
    written,
    removed: cleanStaleFiles(options.outputDir, keep),
  };
}
