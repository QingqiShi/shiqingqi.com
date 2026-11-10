import { describe, expect, it } from "vitest";
import type { PropsDoc } from "../types.ts";
import { renderAgentIndex } from "./render-agent-index.ts";

function docOf(name: string, component: string): PropsDoc {
  return {
    name,
    component,
    kind: "component",
    source: `packages/ui/src/${name}.tsx`,
    props: [
      {
        name: "label",
        type: "string",
        kind: "string",
        required: true,
        description: { en: "The label.", zh: "" },
      },
    ],
  };
}

describe("renderAgentIndex", () => {
  it("lists a component that no group names under Other, and reports it", () => {
    const index = renderAgentIndex({
      docs: new Map([
        ["button", docOf("button", "Button")],
        ["new-thing", docOf("new-thing", "NewThing")],
      ]),
      catalogue: [
        {
          slug: "actions",
          title: "Actions",
          entries: [{ names: ["button"], when: "Every action." }],
        },
      ],
      examples: new Map(),
      primitiveMembers: new Map(),
    });

    expect(index.unlisted).toEqual(["new-thing"]);
    expect(index.files.get("components.md")).toContain(
      "`NewThing` from `@tuja/ui/components/new-thing`",
    );
    expect(index.files.get("components/other.md")).toContain(
      "`label: string` — The label.",
    );
  });
});
