// Guards the failure mode that silently killed Button's press transition.
//
// StyleX resolves values at build time, and it only follows a member reference
// ACROSS a module boundary for its own constructs (`defineVars`,
// `defineConsts`, `create`, `keyframes`, …). A plain object exported from a
// `*.stylex.ts` file resolves fine inside that module and compiles to nothing
// at a foreign call site — and StyleX drops the whole declaration rather than
// erroring, so the styles just go missing. `duration`/`easing` were plain
// objects for exactly that reason, which cost every Button its
// background/transform/filter transition with nothing to show for it: no error,
// no failing test, no rule in the stylesheet.
//
// So: every export from a `*.stylex.ts` file must be a StyleX construct, unless
// it is listed below as a deliberate non-style value. Pure fs + regex — no
// StyleX, no rendering, mirroring `package-exports.test.ts`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/**
 * Exports from a `*.stylex.ts` file that are deliberately NOT StyleX
 * constructs, keyed as `<package-relative path>#<export name>`. An entry here is
 * a promise that the value is never used as a StyleX style value — only as plain
 * JavaScript — because StyleX cannot resolve it from another module. Maintained
 * by hand: adding a non-StyleX export forces a deliberate decision.
 */
const EXPECTED_NON_STYLEX_EXPORTS: ReadonlySet<string> = new Set([
  // A plain number for a `setTimeout` in `usePressAnimation`, never a style
  // value. It parses its millisecond count off `duration._150` so it cannot
  // drift from the `transform` leg of `pressTransition`.
  "src/components/button-shared.stylex.ts#PRESS_ANIMATION_DURATION",
]);

/** Recursively list `*.stylex.ts` files as package-relative posix paths. */
function listStylexModules(dirAbs: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const fullPath = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      files.push(...listStylexModules(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".stylex.ts")) {
      files.push(
        path.relative(packageRoot, fullPath).split(path.sep).join("/"),
      );
    }
  }
  return files;
}

interface StylexExport {
  /** `<package-relative path>#<export name>` */
  readonly id: string;
  readonly isStylexConstruct: boolean;
}

/**
 * Top-level `export const NAME = <initializer>` declarations, with whether the
 * initializer is a `stylex.*(…)` call. Every such declaration in this package
 * opens its initializer on the same line as the `export`, so matching per line
 * is enough and keeps the check free of a parser dependency.
 */
function readExports(file: string): StylexExport[] {
  const source = fs.readFileSync(path.join(packageRoot, file), "utf8");
  const exports: StylexExport[] = [];
  for (const line of source.split("\n")) {
    const match = /^export const (\w+)\s*(?::[^=]+)?=\s*(.*)$/.exec(line);
    if (match === null) continue;
    const [, name, initializer] = match;
    exports.push({
      id: `${file}#${name}`,
      isStylexConstruct: /^stylex\.\w+[(<]/.test(initializer),
    });
  }
  return exports;
}

describe("stylex module exports", () => {
  const modules = listStylexModules(path.join(packageRoot, "src"));

  it("finds the stylex modules to check", () => {
    // Guards against the walk silently matching nothing and the suite passing
    // vacuously.
    expect(modules.length).toBeGreaterThan(20);
  });

  it("every export is a stylex construct or an allowlisted plain value", () => {
    const offenders = modules
      .flatMap(readExports)
      .filter((entry) => !entry.isStylexConstruct)
      .filter((entry) => !EXPECTED_NON_STYLEX_EXPORTS.has(entry.id))
      .map((entry) => entry.id)
      .sort();
    // A name here is either a mistake — StyleX will silently drop any
    // declaration that composes it from another module — or a deliberate plain
    // value, which belongs in EXPECTED_NON_STYLEX_EXPORTS above with a reason.
    expect(offenders).toEqual([]);
  });

  it("EXPECTED_NON_STYLEX_EXPORTS has no stale entries", () => {
    const actual = new Set(
      modules
        .flatMap(readExports)
        .filter((entry) => !entry.isStylexConstruct)
        .map((entry) => entry.id),
    );
    const stale = [...EXPECTED_NON_STYLEX_EXPORTS]
      .filter((id) => !actual.has(id))
      .sort();
    expect(stale).toEqual([]);
  });
});
