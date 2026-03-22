#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TranslationEntry } from "./extractor.ts";
import { extractFromSource, mergeResults } from "./extractor.ts";
import { traceClientFiles } from "./import-graph.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "../..");
const srcDir = path.join(projectRoot, "src");
const outputDir = path.join(srcDir, "_generated", "i18n");

/**
 * Recursively collect .ts and .tsx files from a directory,
 * excluding _generated/ and .d.ts files.
 */
function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "_generated" || entry.name === "node_modules") {
        continue;
      }
      files.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile()) {
      // Skip non-TS files
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
        continue;
      }
      // Skip declaration files
      if (entry.name.endsWith(".d.ts")) continue;
      // Skip test setup files (but include .test. and .spec. files
      // so their t() strings land in generated bundles and the Babel
      // plugin can transform them during testing)
      if (entry.name.includes("test-setup")) {
        continue;
      }
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Recursively find all page.tsx and layout.tsx files under a directory.
 */
function collectPageEntryPoints(dir: string): string[] {
  const entries: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      entries.push(...collectPageEntryPoints(fullPath));
    } else if (
      entry.isFile() &&
      (entry.name === "page.tsx" || entry.name === "layout.tsx")
    ) {
      entries.push(fullPath);
    }
  }

  return entries;
}

/**
 * Derive a kebab-case bundle name from a page/layout file path.
 *
 * Examples:
 *   (home)/page.tsx           → home-page
 *   movie-database/(list)/page.tsx → movie-database-list-page
 *   layout.tsx                → root-layout
 */
function entryPointToName(entryPath: string, localeDir: string): string {
  let relative = path.relative(localeDir, entryPath);
  // Remove extension
  relative = relative.replace(/\.(tsx?|jsx?)$/, "");
  // Strip route group parentheses: (name) → name
  relative = relative.replace(/\(([^)]+)\)/g, "$1");
  // Strip dynamic segment brackets: [param] → param
  relative = relative.replace(/\[([^\]]+)\]/g, "$1");
  // Replace path separators with dashes
  let name = relative.split(path.sep).join("-");
  // Handle root case: just "page" or "layout"
  if (name === "page" || name === "layout") {
    name = `root-${name}`;
  }
  return name;
}

/**
 * Generate a TypeScript loader module that exports getClientTranslations().
 */
function generateLoaderSource(name: string): string {
  return [
    `import "server-only";`,
    ``,
    `import type { SupportedLocale } from "#src/types.ts";`,
    ``,
    `import en from "#src/_generated/i18n/client/${name}.en.json";`,
    `import zh from "#src/_generated/i18n/client/${name}.zh.json";`,
    `import { getLocale } from "#src/i18n/server-locale.ts";`,
    ``,
    `const bundles: Record<SupportedLocale, Record<string, string>> = {`,
    `  en,`,
    `  zh,`,
    `};`,
    ``,
    `export function getClientTranslations(): Record<string, string> {`,
    `  return bundles[getLocale()];`,
    `}`,
    ``,
  ].join("\n");
}

/**
 * Generate per-page client translation bundles, loader modules, and manifest.
 */
function generatePerPageBundles(allEntries: TranslationEntry[]): void {
  const localeDir = path.join(srcDir, "app", "[locale]");
  const entryPoints = collectPageEntryPoints(localeDir);

  // Build a map from relative file path → entries
  const entriesByFile = new Map<string, TranslationEntry[]>();
  for (const entry of allEntries) {
    const existing = entriesByFile.get(entry.file);
    if (existing) {
      existing.push(entry);
    } else {
      entriesByFile.set(entry.file, [entry]);
    }
  }

  const clientDir = path.join(outputDir, "client");
  const loadersDir = path.join(outputDir, "client-loaders");
  fs.mkdirSync(clientDir, { recursive: true });
  fs.mkdirSync(loadersDir, { recursive: true });

  const manifest: Record<string, string> = {};
  let totalBundles = 0;

  for (const entryPoint of entryPoints) {
    const clientFiles = traceClientFiles(entryPoint, srcDir);

    // Collect entries from client files
    const clientEntries: TranslationEntry[] = [];
    for (const clientFile of clientFiles) {
      const relPath = path.relative(projectRoot, clientFile);
      const fileEntries = entriesByFile.get(relPath);
      if (fileEntries) {
        clientEntries.push(...fileEntries);
      }
    }

    if (clientEntries.length === 0) continue;

    // Deduplicate and sort
    const seen = new Set<string>();
    const dedupedEntries = clientEntries.filter((e) => {
      if (seen.has(e.key)) return false;
      seen.add(e.key);
      return true;
    });
    dedupedEntries.sort((a, b) => a.key.localeCompare(b.key));

    const name = entryPointToName(entryPoint, localeDir);

    // Generate per-locale JSON bundles
    const enMap: Record<string, string> = {};
    const zhMap: Record<string, string> = {};
    for (const entry of dedupedEntries) {
      enMap[entry.key] = entry.en;
      zhMap[entry.key] = entry.zh;
    }

    fs.writeFileSync(
      path.join(clientDir, `${name}.en.json`),
      JSON.stringify(enMap, null, 2) + "\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(clientDir, `${name}.zh.json`),
      JSON.stringify(zhMap, null, 2) + "\n",
      "utf8",
    );

    // Generate loader module
    fs.writeFileSync(
      path.join(loadersDir, `${name}.ts`),
      generateLoaderSource(name),
      "utf8",
    );

    // Add to manifest
    const relEntryPoint = path.relative(projectRoot, entryPoint);
    manifest[relEntryPoint] = name;
    totalBundles++;

    console.log(
      `  Client bundle: ${name} (${String(dedupedEntries.length)} keys)`,
    );
  }

  // Write manifest
  fs.writeFileSync(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );

  console.log(`Generated ${String(totalBundles)} per-page client bundles`);
}

/**
 * Generate i18n JSON bundles from extracted translations.
 */
function main(): void {
  console.log("Scanning source files for t() calls...");

  const sourceFiles = collectSourceFiles(srcDir);
  console.log(`Found ${String(sourceFiles.length)} source files`);

  const results = sourceFiles.map((filePath) => {
    const code = fs.readFileSync(filePath, "utf8");
    const relativePath = path.relative(projectRoot, filePath);
    return extractFromSource(code, relativePath);
  });

  const merged = mergeResults(results);

  // Print warnings and fail on collisions
  let hasCollision = false;
  for (const warning of merged.warnings) {
    console.warn(
      `WARNING [${warning.file}:${String(warning.line)}]: ${warning.message}`,
    );
    if (warning.type === "conflicting-translation") {
      hasCollision = true;
    }
  }
  if (hasCollision) {
    const msg =
      "Hash collision detected. Change one of the strings slightly to resolve.";
    if (process.argv.includes("--watch")) {
      console.error(`ERROR: ${msg}`);
      return;
    }
    console.error(`ERROR: ${msg}`);
    process.exit(1);
  }

  // Build locale maps with sorted keys
  const enMap: Record<string, string> = {};
  const zhMap: Record<string, string> = {};

  const sortedEntries = merged.entries
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key));

  for (const entry of sortedEntries) {
    enMap[entry.key] = entry.en;
    zhMap[entry.key] = entry.zh;
  }

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Write global JSON bundles (for server-side __i18n_lookup)
  const enPath = path.join(outputDir, "translations.en.json");
  const zhPath = path.join(outputDir, "translations.zh.json");

  fs.writeFileSync(enPath, JSON.stringify(enMap, null, 2) + "\n", "utf8");
  fs.writeFileSync(zhPath, JSON.stringify(zhMap, null, 2) + "\n", "utf8");

  console.log(
    `Generated ${String(sortedEntries.length)} global translation entries`,
  );
  console.log(`  ${enPath}`);
  console.log(`  ${zhPath}`);

  // Generate per-page client bundles, loaders, and manifest
  console.log("\nGenerating per-page client bundles...");
  generatePerPageBundles(merged.entries);
}

main();

if (process.argv.includes("--watch")) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  console.log("\nWatching for changes in src/...");

  fs.watch(srcDir, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    // Only care about TS/TSX source files, ignore generated output
    if (!/\.[jt]sx?$/.test(filename)) return;
    if (filename.includes("_generated")) return;

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
