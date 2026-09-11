import { describe, expect, it } from "vitest";
import { buildLabSnippet, type LabSnippet } from "./build-lab-snippet.ts";
import type { LabControlModel, LabPropDoc, LabProps } from "./types.ts";

const DOCS: LabPropDoc[] = [
  { name: "children", kind: "node" },
  { name: "look", kind: "enum", members: ["primary", "outline"] },
  {
    name: "size",
    kind: "enum",
    members: ["sm", "md", "lg"],
    defaultValue: '"md"',
  },
  { name: "icon", kind: "node" },
  { name: "loading", kind: "boolean" },
  { name: "aria-label", kind: "string" },
];

const CONTROLS: LabControlModel[] = [
  { name: "children", kind: "node" },
  { name: "look", kind: "enum", members: ["primary", "outline"] },
  {
    name: "size",
    kind: "enum",
    members: ["sm", "md", "lg"],
    defaultValue: '"md"',
  },
  {
    name: "icon",
    kind: "node",
    samples: [
      { id: "none", label: "None", code: "", imports: [], value: undefined },
      {
        id: "plus",
        label: "Plus",
        code: "<PlusIcon />",
        imports: [
          { name: "PlusIcon", from: "@phosphor-icons/react/dist/ssr/Plus" },
        ],
        value: null,
      },
    ],
  },
  { name: "loading", kind: "boolean" },
];

function build(props: LabProps): LabSnippet {
  return buildLabSnippet({
    element: "Button",
    importPath: "@tuja/ui/components/button",
    props,
    docs: DOCS,
    controls: CONTROLS,
  });
}

/** Every run in source order, which is what the card draws. */
function runs(snippet: LabSnippet) {
  return snippet.parts.flatMap((part) => [
    ["plain", part.lead] as const,
    ...part.tokens,
  ]);
}

const IMPORT_LINE = 'import { Button } from "@tuja/ui/components/button";\n\n';

describe("buildLabSnippet", () => {
  it("prints one line while it fits", () => {
    expect(build({ children: "Save changes", look: "outline" }).text).toBe(
      `${IMPORT_LINE}<Button look="outline">Save changes</Button>`,
    );
  });

  it("concatenates its runs into the same source", () => {
    const snippet = build({ children: "Save changes", look: "outline" });
    expect(
      runs(snippet)
        .map(([, text]) => text)
        .join(""),
    ).toBe(snippet.text);
  });

  it("omits a prop that is already its default", () => {
    expect(build({ children: "Save", size: "md" }).text).toBe(
      `${IMPORT_LINE}<Button>Save</Button>`,
    );
  });

  it("prints a true boolean as a bare attribute and omits a false one", () => {
    expect(build({ children: "Save", loading: true }).text).toBe(
      `${IMPORT_LINE}<Button loading>Save</Button>`,
    );
    expect(build({ children: "Save", loading: false }).text).toBe(
      `${IMPORT_LINE}<Button>Save</Button>`,
    );
  });

  it("closes itself and names itself when there are no children", () => {
    expect(build({ icon: "plus", "aria-label": "Add item" }).text).toBe(
      `import { Button } from "@tuja/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";

<Button icon={<PlusIcon />} aria-label="Add item" />`,
    );
  });

  it("breaks to one attribute per line past the column cap", () => {
    expect(
      build({
        children: "Save changes",
        look: "outline",
        size: "lg",
        icon: "plus",
        loading: true,
      }).text,
    ).toBe(`import { Button } from "@tuja/ui/components/button";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";

<Button
  look="outline"
  size="lg"
  icon={<PlusIcon />}
  loading
>
  Save changes
</Button>`);
  });

  it("names each part so the card can morph it on its own", () => {
    const snippet = build({ children: "Save", look: "outline", size: "lg" });
    expect(snippet.parts.map((part) => part.id)).toEqual([
      "import-Button",
      "open",
      "attr-look",
      'attr-look:"outline"',
      "attr-size",
      'attr-size:"lg"',
      "close",
      "children",
      "end",
    ]);
    expect(snippet.parts.map((part) => part.lead)).toEqual([
      "",
      "\n\n",
      " ",
      "",
      " ",
      "",
      "",
      "",
      "",
    ]);
  });

  it("gives a value a part of its own, right after its attribute", () => {
    const snippet = build({ children: "Save", look: "outline", size: "lg" });
    const look = snippet.parts.find((part) => part.id === "attr-look");
    const value = snippet.parts.find(
      (part) => part.id === 'attr-look:"outline"',
    );
    expect(look?.tokens).toEqual([
      ["attr", "look"],
      ["punct", "="],
    ]);
    expect(value?.tokens).toEqual([["string", '"outline"']]);
  });

  it("emits no value part for a bare boolean attribute", () => {
    const snippet = build({ children: "Save", loading: true });
    expect(
      snippet.parts.some((part) => part.id.startsWith("attr-loading:")),
    ).toBe(false);
  });
});
