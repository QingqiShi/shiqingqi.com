import { describe, expect, it } from "vitest";
import { labReducer, type LabState } from "./lab-reducer.ts";
import type { LabVariant } from "./types.ts";

interface Props {
  children?: string;
  look?: string;
  size?: string;
}

const VARIANTS: LabVariant<Props>[] = [
  {
    id: "default",
    label: { en: "Default", zh: "默认" },
    props: { children: "Save" },
  },
  {
    id: "outline",
    label: { en: "Outline", zh: "描边" },
    props: { children: "Save", look: "outline" },
  },
];

const reduce = labReducer(VARIANTS);

const START: LabState = {
  variantId: "default",
  props: { children: "Save" },
};

describe("labReducer", () => {
  it("takes the whole prop set from the Variant it selects", () => {
    const next = reduce(
      { ...START, props: { children: "Save", size: "lg" } },
      { type: "selectVariant", variantId: "outline" },
    );
    expect(next).toEqual({
      variantId: "outline",
      props: { children: "Save", look: "outline" },
    });
  });

  it("sets one prop and leaves the Variant it came from", () => {
    const next = reduce(START, { type: "setProp", prop: "size", value: "lg" });
    expect(next.variantId).toBe("default");
    expect(next.props).toEqual({ children: "Save", size: "lg" });
  });

  it("returns to the selected Variant's props on reset", () => {
    const tuned = reduce(START, { type: "setProp", prop: "size", value: "lg" });
    expect(reduce(tuned, { type: "reset" }).props).toEqual({
      children: "Save",
    });
  });
});
