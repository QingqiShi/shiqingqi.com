// DESIGN.md: "Every fixed-radius corner is a squircle" — and the full-round
// radius pins circular caps instead. The `corner` primitive
// (primitives/corner.stylex.ts) pairs a radius with its `cornerShape` so a
// consumer composing a radius gets the shape for free — but nothing stops a
// component from setting a radius property directly instead of composing the
// primitive, which would silently leave that corner's shape to chance. Guard
// the invariant everywhere a radius property survives outside the primitive:
// a bare radius property must carry `cornerShape` in the same object literal.
//
// A `stylex.defineVars` argument is a token/value definition, not an applied
// style — the shape is paired wherever the token is actually consumed as a
// `borderRadius` (a `stylex.create` style, caught by this same check at that
// call site), so a radius-named var default is exempt.
//
// Pure fs + a hand-rolled brace scanner — no StyleX, no rendering, mirroring
// `package-exports.test.ts` / `stylex-module-exports.test.ts`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const srcRoot = path.join(packageRoot, "src");

// The one file allowed to declare a radius without a local `cornerShape`
// pairing on every entry, individually — it pairs every entry itself and is
// the canonical definition site the rest of the package composes instead of
// repeating this pairing.
const EXEMPT_FILE = "primitives/corner.stylex.ts";

const RADIUS_PROPERTIES = [
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderStartStartRadius",
  "borderStartEndRadius",
  "borderEndStartRadius",
  "borderEndEndRadius",
] as const;
const RADIUS_PROPERTY_SET: ReadonlySet<string> = new Set(RADIUS_PROPERTIES);

/** Recursively list `.ts`/`.tsx` files as package-relative posix paths. */
function listSourceFiles(dirAbs: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    if (entry.name === "_generated") continue;
    const fullPath = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(path.relative(srcRoot, fullPath).split(path.sep).join("/"));
    }
  }
  return files;
}

function isTestFile(file: string): boolean {
  return /\.test\.[jt]sx?$/.test(path.basename(file));
}

function isIdentifierChar(ch: string | undefined): boolean {
  return ch !== undefined && /[A-Za-z0-9_$]/.test(ch);
}

interface Frame {
  hasCornerShape: boolean;
  isDefineVarsArg: boolean;
}

interface RadiusOccurrence {
  readonly line: number;
  readonly property: string;
  readonly frame: Frame;
}

/**
 * Walks the source once, tracking brace-literal nesting so each radius
 * property occurrence can be attributed to its nearest enclosing object
 * literal, and whether that same literal also declares `cornerShape`.
 *
 * String and template-literal contents are skipped wholesale rather than
 * parsed: a `${…}` interpolation's braces are never object-literal braces
 * that a radius/cornerShape pairing could live in, so treating the whole
 * quoted span as opaque is correct here, not just simpler.
 */
function scanForRadiusOccurrences(source: string): RadiusOccurrence[] {
  const occurrences: RadiusOccurrence[] = [];
  const frameStack: Frame[] = [];
  let pendingDefineVars = false;
  let line = 1;
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];

    if (ch === "\n") {
      line++;
      i++;
      continue;
    }

    if (ch === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i);
      i = end === -1 ? len : end;
      continue;
    }

    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? len : end + 2;
      for (let j = i; j < stop; j++) {
        if (source[j] === "\n") line++;
      }
      i = stop;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      i++;
      while (i < len && source[i] !== quote) {
        if (source[i] === "\\") i++;
        else if (source[i] === "\n") line++;
        i++;
      }
      i++;
      continue;
    }

    if (ch === "{") {
      frameStack.push({
        hasCornerShape: false,
        isDefineVarsArg: pendingDefineVars,
      });
      pendingDefineVars = false;
      i++;
      continue;
    }

    if (ch === "}") {
      frameStack.pop();
      i++;
      continue;
    }

    if (isIdentifierChar(ch)) {
      const start = i;
      let j = i;
      while (j < len && isIdentifierChar(source[j])) j++;
      const word = source.slice(start, j);
      let k = j;
      while (k < len && /\s/.test(source[k])) k++;
      const followedByColon = source[k] === ":";
      const precededByDot = start > 0 && source[start - 1] === ".";

      if (word === "cornerShape" && followedByColon) {
        const frame = frameStack.at(-1);
        if (frame) frame.hasCornerShape = true;
      } else if (
        RADIUS_PROPERTY_SET.has(word) &&
        followedByColon &&
        !precededByDot
      ) {
        const frame = frameStack.at(-1);
        if (frame) occurrences.push({ line, property: word, frame });
      } else if (word === "defineVars" && precededByDot) {
        const before = source.slice(Math.max(0, start - 8), start);
        if (before.endsWith("stylex.") && source[k] === "(") {
          pendingDefineVars = true;
        }
      }

      i = j;
      continue;
    }

    i++;
  }

  return occurrences;
}

describe("corner-shape pairing", () => {
  const files = listSourceFiles(srcRoot)
    .filter((file) => !isTestFile(file))
    .sort();

  it("finds the source files to check", () => {
    // Guards against the walk silently matching nothing and the suite
    // passing vacuously.
    expect(files.length).toBeGreaterThan(20);
  });

  it("every radius property outside the corner primitive pairs cornerShape in the same object literal", () => {
    const violations: string[] = [];

    for (const file of files) {
      if (file === EXEMPT_FILE) continue;
      const source = fs.readFileSync(path.join(srcRoot, file), "utf8");
      for (const occurrence of scanForRadiusOccurrences(source)) {
        if (occurrence.frame.isDefineVarsArg) continue;
        if (occurrence.frame.hasCornerShape) continue;
        violations.push(
          `${file}:${String(occurrence.line)} — ${occurrence.property} has no cornerShape in its enclosing object literal`,
        );
      }
    }

    expect(violations).toEqual([]);
  });
});
