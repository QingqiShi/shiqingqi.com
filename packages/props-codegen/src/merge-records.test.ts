import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { collectPropsDoc, createPropsProgram } from "./collect-props-docs.ts";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "props-codegen-enum-"));
const file = path.join(dir, "fixture.ts");
fs.writeFileSync(
  file,
  `
type Level = 1 | 2 | 3;
type Side = "top" | "bottom";
type Align = "start" | "end";
export function Fixture(props: {
  level?: Level;
  placement?: Side | \`\${Side}-\${Align}\`;
  open?: \`open-\${string}\`;
}) {
  return props;
}
`,
);

const doc = collectPropsDoc(
  createPropsProgram([file], dir),
  { name: "fixture", component: "Fixture", kind: "component", file },
  dir,
);
const propNamed = (name: string) =>
  doc.props.find((prop) => prop.name === name);

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("enum members", () => {
  it("keeps the numbers of a numeric literal union as numbers", () => {
    expect(propNamed("level")).toMatchObject({
      kind: "enum",
      members: [1, 2, 3],
      type: "1 | 2 | 3",
    });
  });

  it("expands a template literal over finite unions to its strings", () => {
    expect(propNamed("placement")?.kind).toBe("enum");
    expect(propNamed("placement")?.members?.toSorted()).toEqual([
      "bottom",
      "bottom-end",
      "bottom-start",
      "top",
      "top-end",
      "top-start",
    ]);
  });

  it("leaves a template literal with an open hole as other", () => {
    expect(propNamed("open")?.kind).toBe("other");
  });
});
