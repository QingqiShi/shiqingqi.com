import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentEntry } from "./collect-component-entries.ts";
import { collectPropsDoc, createPropsProgram } from "./collect-props-docs.ts";
import type { PropDoc, PropsDoc } from "./types.ts";

const packageDir = path.resolve(import.meta.dirname, "..");
const fixturesDir = path.join(packageDir, "src", "fixtures");

const entries: ComponentEntry[] = [
  {
    name: "fixture-control",
    component: "FixtureControl",
    file: path.join(fixturesDir, "fixture-control.tsx"),
  },
  {
    name: "fixture-panel",
    component: "FixturePanel",
    file: path.join(fixturesDir, "fixture-panel.tsx"),
  },
  {
    name: "fixture-passthrough",
    component: "FixturePassthrough",
    file: path.join(fixturesDir, "fixture-panel.tsx"),
  },
];

const program = createPropsProgram(
  entries.map((entry) => entry.file),
  packageDir,
);

function docFor(name: string): PropsDoc {
  const entry = entries.find((candidate) => candidate.name === name);
  if (!entry) throw new Error(`No fixture entry ${name}`);
  return collectPropsDoc(program, entry, packageDir);
}

function propFor(doc: PropsDoc, name: string): PropDoc {
  const prop = doc.props.find((candidate) => candidate.name === name);
  if (!prop) throw new Error(`No prop ${name} in ${doc.component}`);
  return prop;
}

describe("collectPropsDoc", () => {
  const control = docFor("fixture-control");

  it("names the component and its source", () => {
    expect(control.component).toBe("FixtureControl");
    expect(control.source).toBe("src/fixtures/fixture-control.tsx");
  });

  it("records the element whose attributes the props extend", () => {
    expect(control.extendsHtml).toBe("button");
  });

  it("leaves out the inherited HTML attributes", () => {
    const names = control.props.map((prop) => prop.name);
    expect(names).not.toContain("type");
    expect(names).not.toContain("disabled");
    expect(names).not.toContain("onClick");
  });

  it("puts children first and css last", () => {
    const names = control.props.map((prop) => prop.name);
    expect(names[0]).toBe("children");
    expect(names.at(-1)).toBe("css");
  });

  it("merges members declared across an intersection", () => {
    expect(propFor(control, "count")).toMatchObject({
      type: "number",
      kind: "number",
      required: true,
    });
  });

  it("reads a string-literal union as an enum with its members", () => {
    expect(propFor(control, "size")).toMatchObject({
      type: '"sm" | "md" | "lg"',
      kind: "enum",
      members: ["sm", "md", "lg"],
      required: false,
      defaultValue: '"md"',
    });
  });

  it("expands a union that a local alias names", () => {
    expect(propFor(control, "tone")).toMatchObject({
      type: '"quiet" | "loud"',
      kind: "enum",
      members: ["quiet", "loud"],
      defaultValue: '"quiet"',
    });
  });

  it("classifies boolean, string, node and function props", () => {
    expect(propFor(control, "bright").kind).toBe("boolean");
    expect(propFor(control, "placeholder").kind).toBe("string");
    expect(propFor(control, "icon").kind).toBe("node");
    expect(propFor(control, "onChange")).toMatchObject({
      kind: "function",
      type: "(next: string) => void",
    });
  });

  it("lets a @default tag beat the destructuring default", () => {
    expect(propFor(control, "position").defaultValue).toBe('"topRight"');
  });

  it("reads the @zh tag as the Chinese description", () => {
    expect(propFor(control, "size").description.zh).toBe("高度阶梯。");
    expect(propFor(control, "bright").description.zh).toBe("");
  });

  it("drops a closing sentence that repeats the default", () => {
    expect(propFor(control, "size").description.en).toBe(
      "Height scale.\n\nA second paragraph, to prove paragraph breaks survive.",
    );
  });

  it("reads the @deprecated tag", () => {
    expect(propFor(control, "shade").deprecated).toBe("Use `tone` instead.");
  });

  it("lists a member of only one union branch once", () => {
    const children = control.props.filter((prop) => prop.name === "children");
    expect(children).toHaveLength(1);
    expect(children[0]).toMatchObject({ type: "ReactNode", required: false });
  });

  it("keeps a name that only one union branch demands optional", () => {
    expect(propFor(control, "aria-label")).toMatchObject({
      type: "string",
      required: false,
    });
  });

  it("adds the children that PropsWithChildren brings", () => {
    const panel = docFor("fixture-panel");
    expect(panel.props.map((prop) => prop.name)).toEqual(["children", "open"]);
    expect(propFor(panel, "children").kind).toBe("node");
    expect(propFor(panel, "open").defaultValue).toBe("false");
  });

  it("documents no props for a pure HTML passthrough", () => {
    const passthrough = docFor("fixture-passthrough");
    expect(passthrough.props).toEqual([]);
    expect(passthrough.extendsHtml).toBe("div");
  });
});
