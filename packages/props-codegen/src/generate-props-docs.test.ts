import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { collectComponentEntries } from "./collect-component-entries.ts";
import { generatePropsDocs } from "./generate-props-docs.ts";
import type { PropsDoc } from "./types.ts";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const uiPackageDir = path.join(repoRoot, "packages", "ui");
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "props-codegen-"));

const result = generatePropsDocs({ repoRoot, uiPackageDir, outputDir });

afterAll(() => {
  fs.rmSync(outputDir, { recursive: true, force: true });
});

function docFor(name: string): PropsDoc {
  const doc = result.docs.get(name);
  if (!doc) throw new Error(`No document for ${name}`);
  return doc;
}

describe("collectComponentEntries", () => {
  it("finds every ./components/<name> export that points at a .tsx source", () => {
    const entries = collectComponentEntries(uiPackageDir);
    expect(entries.length).toBeGreaterThan(40);
    expect(entries).toContainEqual({
      name: "menu-button",
      component: "MenuButton",
      file: path.join(uiPackageDir, "src/components/actions/menu-button.tsx"),
    });
    expect(entries.map((entry) => entry.name)).not.toContain("button.stylex");
  });
});

describe("generatePropsDocs over @tuja/ui", () => {
  it("writes one document per component plus the index", () => {
    const entries = collectComponentEntries(uiPackageDir);
    expect(result.docs.size).toBe(entries.length);
    for (const entry of entries) {
      expect(fs.existsSync(path.join(outputDir, `${entry.name}.json`))).toBe(
        true,
      );
    }
    expect(fs.existsSync(path.join(outputDir, "index.ts"))).toBe(true);
  });

  it("documents at least one prop for every component", () => {
    const empty = [...result.docs]
      .filter(([, doc]) => doc.props.length === 0)
      .map(([name]) => name);
    expect(empty).toEqual([]);
  });

  it("gives every prop a name, a type and a description", () => {
    for (const [name, doc] of result.docs) {
      for (const prop of doc.props) {
        expect(prop.name, `${name}.${prop.name}`).not.toBe("");
        expect(prop.type, `${name}.${prop.name}`).not.toBe("");
        expect(prop.description.en, `${name}.${prop.name}`).toBeTypeOf(
          "string",
        );
      }
    }
  });

  it("reads Button's own props and not its button attributes", () => {
    const button = docFor("button");
    expect(button.component).toBe("Button");
    expect(button.source).toBe("packages/ui/src/components/actions/button.tsx");
    expect(button.extendsHtml).toBe("button");
    const names = button.props.map((prop) => prop.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "children",
        "bright",
        "hideLabelOnMobile",
        "icon",
        "size",
        "isActive",
        "loading",
        "labelId",
        "aria-label",
        "aria-labelledby",
        "css",
      ]),
    );
    expect(names).not.toContain("type");
    expect(names).not.toContain("onClick");
    expect(names[0]).toBe("children");
    expect(names.at(-1)).toBe("css");
  });

  it("reads Button's size scale and its default", () => {
    const size = docFor("button").props.find((prop) => prop.name === "size");
    expect(size).toMatchObject({
      type: '"sm" | "md" | "lg"',
      kind: "enum",
      members: ["sm", "md", "lg"],
      required: false,
      defaultValue: '"md"',
    });
  });

  it("reads Button's four-member fill enum, which has no default", () => {
    const fill = docFor("button").props.find(
      (prop) => prop.members?.length === 4,
    );
    expect(fill).toMatchObject({
      kind: "enum",
      members: ["primary", "outline", "ghost", "danger"],
      type: '"primary" | "outline" | "ghost" | "danger"',
    });
    expect(fill?.defaultValue).toBeUndefined();
  });

  it("classifies Button's boolean and node props", () => {
    const kinds = new Map(
      docFor("button").props.map((prop) => [prop.name, prop.kind]),
    );
    expect(kinds.get("bright")).toBe("boolean");
    expect(kinds.get("hideLabelOnMobile")).toBe("boolean");
    expect(kinds.get("isActive")).toBe("boolean");
    expect(kinds.get("loading")).toBe("boolean");
    expect(kinds.get("icon")).toBe("node");
    expect(kinds.get("children")).toBe("node");
    expect(kinds.get("labelId")).toBe("string");
  });

  it("keeps Badge's required children and flattens its colour enum", () => {
    const badge = docFor("badge");
    expect(badge.extendsHtml).toBe("span");
    const children = badge.props.find((prop) => prop.name === "children");
    expect(children).toMatchObject({ required: true, kind: "node" });
    // Declared over seven lines; the document prints it as one union.
    const colour = badge.props.find((prop) => prop.members?.length === 7);
    expect(colour).toMatchObject({
      type: '"default" | "neutral" | "info" | "success" | "warning" | "danger" | "accent"',
      defaultValue: '"default"',
    });
  });

  it("reads a generic component's own props", () => {
    const control = docFor("segmented-control");
    const names = control.props.map((prop) => prop.name);
    expect(names).toContain("options");
    expect(names).toContain("value");
    expect(names.at(-1)).toBe("css");
    const onChange = control.props.find((prop) => prop.name === "onChange");
    expect(onChange).toMatchObject({ kind: "function", required: true });
  });

  it("reads props a component takes whole and destructures in its body", () => {
    const size = docFor("chip").props.find((prop) => prop.name === "size");
    expect(size?.defaultValue).toBe('"md"');
  });

  it("keeps a Chinese sentence whole, with no space inside it", () => {
    const CJK = "\u2014\u2026\u3000-\u303f\u3400-\u9fff\uff00-\uffef";
    const spaceInsideChinese = new RegExp(`[${CJK}] [${CJK}]`, "u");
    for (const [name, doc] of result.docs) {
      for (const prop of doc.props) {
        expect(prop.description.zh, `${name}.${prop.name}`).not.toMatch(
          spaceInsideChinese,
        );
      }
    }
  });

  it("reads a heritage clause that names a local interface", () => {
    const names = docFor("table-header-cell").props.map((prop) => prop.name);
    expect(names).toContain("align");
    expect(names).toContain("numeric");
    expect(names).toContain("scope");
  });
});
