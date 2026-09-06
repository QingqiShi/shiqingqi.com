import { describe, expect, it } from "vitest";
import {
  activeCompoundKeys,
  BASE,
  conditionKey,
  conditionParts,
  conditionSuffix,
  isCompoundKey,
  parseConditionKey,
  sameCondition,
  stateKeys,
} from "./condition-key.ts";
import type { LayerConfig } from "./types.ts";

describe("conditionKey and parseConditionKey", () => {
  it("round-trips the base condition", () => {
    expect(conditionKey(BASE)).toBe("base");
    expect(parseConditionKey("base")).toEqual(BASE);
  });

  it("round-trips a state condition", () => {
    const condition = conditionKey({ kind: "state", name: "hover" });
    expect(condition).toBe("state:hover");
    expect(parseConditionKey(condition)).toEqual({
      kind: "state",
      name: "hover",
    });
  });

  it("round-trips a variant condition", () => {
    const condition = conditionKey({ kind: "variant", name: "sm" });
    expect(condition).toBe("variant:sm");
    expect(parseConditionKey(condition)).toEqual({
      kind: "variant",
      name: "sm",
    });
  });

  it("round-trips a compound condition, space included", () => {
    const condition = conditionKey({ kind: "compound", name: "checked sm" });
    expect(condition).toBe("compound:checked sm");
    expect(parseConditionKey(condition)).toEqual({
      kind: "compound",
      name: "checked sm",
    });
  });
});

describe("conditionSuffix", () => {
  it("is empty for base", () => {
    expect(conditionSuffix(BASE)).toBe("");
  });

  it("brackets a state name", () => {
    expect(conditionSuffix({ kind: "state", name: "hover" })).toBe("[hover]");
  });

  it("brackets a compound key whole, space included", () => {
    expect(conditionSuffix({ kind: "compound", name: "checked sm" })).toBe(
      "[checked sm]",
    );
  });
});

describe("sameCondition", () => {
  it("is true for two conditions of the same kind and name", () => {
    expect(
      sameCondition(
        { kind: "state", name: "hover" },
        { kind: "state", name: "hover" },
      ),
    ).toBe(true);
  });

  it("is false when the kind differs", () => {
    expect(
      sameCondition(
        { kind: "state", name: "sm" },
        { kind: "variant", name: "sm" },
      ),
    ).toBe(false);
  });

  it("is false when the name differs", () => {
    expect(
      sameCondition(
        { kind: "state", name: "hover" },
        { kind: "state", name: "focus" },
      ),
    ).toBe(false);
  });
});

describe("isCompoundKey", () => {
  it("is false for a plain state or variant name", () => {
    expect(isCompoundKey("hover")).toBe(false);
  });

  it("is true for a space-separated key naming a state and a variant", () => {
    expect(isCompoundKey("checked sm")).toBe(true);
  });
});

describe("conditionParts", () => {
  it("splits a compound key on its spaces", () => {
    expect(conditionParts("checked sm")).toEqual(["checked", "sm"]);
  });

  it("names a single part for a plain key", () => {
    expect(conditionParts("hover")).toEqual(["hover"]);
  });
});

describe("stateKeys", () => {
  it("splits a layer's states into plain keys and compound keys", () => {
    const layerConfig: LayerConfig = {
      states: {
        hover: { color: "color.a" },
        "checked sm": { transform: "translateX(0)" },
        selected: { color: "color.b" },
        "checked md": { transform: "translateX(1px)" },
      },
    };
    expect(stateKeys(layerConfig)).toEqual({
      plain: ["hover", "selected"],
      compound: ["checked sm", "checked md"],
    });
  });

  it("is empty for a layer with no states", () => {
    expect(stateKeys({})).toEqual({ plain: [], compound: [] });
  });
});

describe("activeCompoundKeys", () => {
  const layerConfig: LayerConfig = {
    states: {
      "checked sm": { transform: "translateX({controlSize._8})" },
      "checked md": { transform: "translateX({controlSize._9})" },
      "indeterminate sm": {
        transform: "translateX(calc({controlSize._8} / 2))",
      },
    },
  };

  it("picks only the compound keys whose every part is active", () => {
    expect(
      activeCompoundKeys(layerConfig, ["sm"], ["checked", "indeterminate"]),
    ).toEqual(["checked sm", "indeterminate sm"]);
  });

  it("excludes a compound key when its variant part is not active", () => {
    expect(activeCompoundKeys(layerConfig, ["md"], ["checked"])).toEqual([
      "checked md",
    ]);
  });

  it("excludes a compound key when its state part is not active", () => {
    expect(activeCompoundKeys(layerConfig, ["sm"], [])).toEqual([]);
  });
});
