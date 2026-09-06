import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, it } from "vitest";
import { packageRoot } from "../src/adapter/design-system-sources.mjs";
import { buildAdapter } from "../src/adapter/index.mjs";
import { assertNoExternalRequests } from "./assert-no-external-requests.mjs";

const execFileAsync = promisify(execFile);

const EXAMPLES_DIR = path.join(packageRoot, "examples");
const EXAMPLES = [
  { file: "segmented-control.playground.tsx", component: "SegmentedControl" },
  { file: "switch.playground.tsx", component: "Switch" },
];
const BUILD_SCRIPT = path.join(packageRoot, "scripts/build.mjs");

describe("scripts/build.mjs", () => {
  const tempDirs = [];

  afterAll(() => {
    for (const dir of tempDirs)
      fs.rmSync(dir, { recursive: true, force: true });
  });

  it(
    "builds every example at once, outside the package, into one inert HTML fragment beside its config",
    { timeout: 120_000 },
    async () => {
      const adapterCss = buildAdapter().css;

      const outputPaths = await Promise.all(
        EXAMPLES.map(async ({ file }) => {
          const tempDir = fs.mkdtempSync(
            path.join(os.tmpdir(), "component-playground-build-"),
          );
          tempDirs.push(tempDir);
          const copyPath = path.join(tempDir, file);
          fs.copyFileSync(path.join(EXAMPLES_DIR, file), copyPath);

          await execFileAsync(process.execPath, [BUILD_SCRIPT, copyPath], {
            cwd: packageRoot,
          });

          return copyPath.replace(/\.playground\.tsx$/, ".html");
        }),
      );

      outputPaths.forEach((outputPath, index) => {
        expect(fs.existsSync(outputPath)).toBe(true);

        const html = fs.readFileSync(outputPath, "utf8");

        // Each build wrote its own component and nothing of the one beside
        // it, so the two runs kept their files apart.
        expect(
          html.startsWith(
            `<title>${EXAMPLES[index].component} playground</title>`,
          ),
        ).toBe(true);
        for (const other of EXAMPLES) {
          if (other === EXAMPLES[index]) continue;
          expect(html).not.toContain(other.component);
        }
        // A well-formed close is the reliable count: the minified bundle can
        // (and does) carry the literal text "<script" inside a string, but
        // the build escapes any real "</script>" in its content, so a true
        // element boundary is the only place this exact text appears.
        expect(html.match(/<\/script>/g)).toHaveLength(1);
        expect(html.match(/<\/style>/g)).toHaveLength(1);
        expect(html).not.toMatch(/<!doctype/i);
        expect(html).not.toMatch(/<html[\s>]/i);
        expect(html).not.toMatch(/<head[\s>]/i);
        expect(html).not.toMatch(/<body[\s>]/i);
        expect(() => assertNoExternalRequests(html)).not.toThrow();
        expect(html).toContain(adapterCss);

        const { size } = fs.statSync(outputPath);
        expect(size).toBeGreaterThan(300 * 1024);
        expect(size).toBeLessThan(700 * 1024);
      });
    },
  );
});
