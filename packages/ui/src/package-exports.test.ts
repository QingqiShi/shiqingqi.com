// Package-integrity checks over the exports map in package.json. Pure
// fs + JSON — no StyleX, no rendering. Two invariants:
//   (a) every exports target resolves to a real file (no dead subpaths), and
//   (b) every source module under src/ is either exported or explicitly
//       listed as internal, so adding a file forces a deliberate decision.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/**
 * Source modules deliberately kept OUT of the exports map (internal
 * implementation details). Every other module under src/ must appear in the
 * exports map. Maintained by hand: when adding an internal-only module, list
 * it here with a reason; when promoting one to the public API, remove it.
 * Entries are package-relative paths. Entries for files that don't exist yet
 * are inert, so the list can lead the code by one wave.
 */
const EXPECTED_UNEXPORTED: ReadonlySet<string> = new Set([
  // Ref-merging helper shared between components; not public API.
  "src/utils/merge-refs.ts",
]);

// Hue ramps the "./palette/*" wildcard export must always cover.
const KNOWN_HUES = [
  "blue",
  "brown",
  "cyan",
  "gray",
  "green",
  "indigo",
  "mint",
  "orange",
  "pink",
  "purple",
  "red",
  "teal",
  "yellow",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readExportsMap(): ReadonlyMap<string, string> {
  const raw: unknown = JSON.parse(
    fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
  );
  if (!isRecord(raw) || !isRecord(raw.exports)) {
    throw new Error("packages/ui/package.json is missing an exports map");
  }
  const entries = new Map<string, string>();
  for (const [subpath, target] of Object.entries(raw.exports)) {
    if (typeof target !== "string") {
      // Conditional-export objects would need this test to resolve conditions;
      // fail loudly so the test is updated deliberately alongside the change.
      throw new Error(`exports["${subpath}"] is not a plain file path`);
    }
    entries.set(subpath, target);
  }
  return entries;
}

/** "./src/foo.ts" -> "src/foo.ts" */
function normalizeTarget(target: string): string {
  return target.startsWith("./") ? target.slice(2) : target;
}

/** Recursively list files under `dirAbs` as package-relative posix paths. */
function listFiles(dirAbs: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const fullPath = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(
        path.relative(packageRoot, fullPath).split(path.sep).join("/"),
      );
    }
  }
  return files;
}

/** Expand a normalized wildcard target to the files it matches on disk. */
function expandWildcardTarget(target: string): string[] {
  const starIndex = target.indexOf("*");
  const prefix = target.slice(0, starIndex);
  const suffix = target.slice(starIndex + 1);
  const patternDir = prefix.slice(0, prefix.lastIndexOf("/"));
  const patternDirAbs = path.join(packageRoot, patternDir);
  if (!fs.existsSync(patternDirAbs)) return [];
  return fs
    .readdirSync(patternDirAbs)
    .map((name) => `${patternDir}/${name}`)
    .filter((file) => file.startsWith(prefix) && file.endsWith(suffix));
}

/** All source files reachable through the exports map. */
function collectExportedFiles(
  exportsMap: ReadonlyMap<string, string>,
): ReadonlySet<string> {
  const exported = new Set<string>();
  for (const target of exportsMap.values()) {
    const normalized = normalizeTarget(target);
    if (normalized.includes("*")) {
      for (const file of expandWildcardTarget(normalized)) {
        exported.add(file);
      }
    } else {
      exported.add(normalized);
    }
  }
  return exported;
}

/** Files that never need an exports entry: tests, setup, type declarations. */
function isTestInfrastructure(file: string): boolean {
  const base = path.basename(file);
  return (
    /\.(test|spec)\.[jt]sx?$/.test(base) ||
    base.endsWith(".d.ts") ||
    file === "src/test-setup.ts"
  );
}

describe("package exports", () => {
  const exportsMap = readExportsMap();

  it("every exports target points at an existing file", () => {
    const missing: string[] = [];
    for (const [subpath, target] of exportsMap) {
      const normalized = normalizeTarget(target);
      if (normalized.includes("*")) {
        if (expandWildcardTarget(normalized).length === 0) {
          missing.push(`${subpath} -> ${target} (matches no files)`);
        }
      } else if (!fs.existsSync(path.join(packageRoot, normalized))) {
        missing.push(`${subpath} -> ${target}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("the palette wildcard resolves every known hue", () => {
    const target = exportsMap.get("./palette/*");
    expect(target).toBeDefined();
    if (target === undefined) return;
    const normalized = normalizeTarget(target);
    const starIndex = normalized.indexOf("*");
    expect(starIndex).toBeGreaterThan(-1);
    const prefix = normalized.slice(0, starIndex);
    const suffix = normalized.slice(starIndex + 1);
    const missing = KNOWN_HUES.filter(
      (hue) => !fs.existsSync(path.join(packageRoot, prefix + hue + suffix)),
    );
    expect(missing).toEqual([]);
  });

  it("every source module is exported or explicitly internal", () => {
    const exported = collectExportedFiles(exportsMap);
    const unaccounted = listFiles(path.join(packageRoot, "src"))
      .filter((file) => /\.[jt]sx?$/.test(file))
      .filter((file) => !isTestInfrastructure(file))
      .filter((file) => !exported.has(file))
      .filter((file) => !EXPECTED_UNEXPORTED.has(file))
      .sort();
    // A file listed here needs either an exports entry in package.json or an
    // EXPECTED_UNEXPORTED entry above (with a reason).
    expect(unaccounted).toEqual([]);
  });

  it("EXPECTED_UNEXPORTED only lists modules that are actually unexported", () => {
    const exported = collectExportedFiles(exportsMap);
    const stale = [...EXPECTED_UNEXPORTED].filter((file) => exported.has(file));
    expect(stale).toEqual([]);
  });
});
