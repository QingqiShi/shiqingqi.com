import { afterEach, describe, expect, it, vi } from "vitest";
import { readEffectLayerMode } from "./read-effect-layer-mode.ts";

function visit(search: string) {
  window.history.replaceState(null, "", `/${search}`);
}

describe("readEffectLayerMode", () => {
  afterEach(() => {
    visit("");
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("runs by default", () => {
    expect(readEffectLayerMode()).toBe("on");
  });

  it("turns off with ?effects=off", () => {
    visit("?effects=off");
    expect(readEffectLayerMode()).toBe("off");
  });

  it("shows the debug view with ?effects=debug", () => {
    visit("?effects=debug");
    expect(readEffectLayerMode()).toBe("debug");
  });

  it("turns off with the effect-layer localStorage key", () => {
    window.localStorage.setItem("effect-layer", "off");
    expect(readEffectLayerMode()).toBe("off");
  });

  it("lets the query of one page load win over the localStorage key", () => {
    window.localStorage.setItem("effect-layer", "off");
    visit("?effects=debug");
    expect(readEffectLayerMode()).toBe("debug");
  });

  it("ignores a query value it does not know", () => {
    visit("?effects=on");
    expect(readEffectLayerMode()).toBe("on");
  });

  it("runs when the browser blocks storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage is blocked", "SecurityError");
    });
    expect(readEffectLayerMode()).toBe("on");
  });
});
