import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { generatePropsDocs } from "./generate-props-docs.ts";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const uiPackageDir = path.join(repoRoot, "packages", "ui");
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "props-codegen-"));

const result = generatePropsDocs({ repoRoot, uiPackageDir, outputDir });

afterAll(() => {
  fs.rmSync(outputDir, { recursive: true, force: true });
});

describe("generatePropsDocs over @tuja/ui", () => {
  it("documents at least one prop for every component", () => {
    const empty = [...result.docs]
      .filter(([, doc]) => doc.props.length === 0)
      .map(([name]) => name);
    expect(empty).toEqual([]);
  });

  it("leaves out the props that an Omit of a base removes", () => {
    const names = result.docs.get("date-field")?.props.map(({ name }) => name);
    expect(names).toContain("label");
    expect(names).not.toContain("leading");
  });
});
