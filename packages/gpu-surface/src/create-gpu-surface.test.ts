// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGpuSurface, type GpuSurface } from "./create-gpu-surface.ts";
import {
  installFakeBrowser,
  nextFrame,
} from "./test-support/install-fake-browser.ts";

const surfaces: GpuSurface[] = [];

function create(clearColor: string) {
  const surface = createGpuSurface({ clearColor });
  surfaces.push(surface);
  return surface;
}

afterEach(() => {
  for (const surface of surfaces.splice(0)) surface.destroy();
  document.head.replaceChildren();
  document.body.replaceChildren();
  document.documentElement.className = "";
});

describe("createGpuSurface without WebGL2", () => {
  it("fails, stays hidden, and leaves the page as it is", () => {
    const surface = create("rgb(1, 2, 3)");
    expect(surface.state).toBe("failed");
    expect(surface.canvas.dataset.state).toBe("failed");
    expect(surface.canvas.style.visibility).toBe("hidden");
    expect([...document.body.children]).toEqual([surface.canvas]);
  });

  it("removes the canvas element on destroy", () => {
    const surface = create("rgb(1, 2, 3)");
    surface.destroy();
    expect(document.body.children).toHaveLength(0);
  });
});

describe("createGpuSurface with WebGL2", () => {
  let browser: ReturnType<typeof installFakeBrowser>;

  beforeEach(() => {
    browser = installFakeBrowser();
    const style = document.createElement("style");
    style.textContent =
      "html { color: rgb(245, 245, 245) } html.dark { color: rgb(0, 0, 0) }";
    document.head.append(style);
  });

  function lastClear() {
    return browser.context().clears.at(-1)?.rgba;
  }

  it("puts the canvas element behind the page, hidden until the first frame", () => {
    const surface = create("rgb(1, 2, 3)");
    expect(surface.state).toBe("pending");
    expect(surface.canvas.parentElement).toBe(document.body);
    expect(surface.canvas.getAttribute("aria-hidden")).toBe("true");
    expect(surface.canvas.style).toMatchObject({
      position: "absolute",
      zIndex: "-1",
      pointerEvents: "none",
      visibility: "hidden",
    });
    expect(browser.context().clears).toHaveLength(0);
  });

  it("clears the band to the colour and shows it", async () => {
    const surface = create("rgb(1, 2, 3)");
    await nextFrame();
    expect(surface.state).toBe("ready");
    expect(surface.canvas.dataset.state).toBe("ready");
    expect(surface.canvas.style.visibility).toBe("");
    expect(lastClear()).toEqual([1 / 255, 2 / 255, 3 / 255, 1]);
  });

  it("fails on a colour that is not opaque", async () => {
    const surface = create("rgba(1, 2, 3, 0.5)");
    await nextFrame();
    expect(surface.state).toBe("failed");
    expect(surface.canvas.style.visibility).toBe("hidden");
    expect(browser.context().lost).toBe(true);
  });

  it("draws the new colour when the theme switch rewrites the class of <html>", async () => {
    const surface = create("currentcolor");
    await nextFrame();
    expect(lastClear()).toEqual([245 / 255, 245 / 255, 245 / 255, 1]);
    document.documentElement.className = "dark";
    await nextFrame();
    expect(surface.state).toBe("ready");
    expect(lastClear()).toEqual([0, 0, 0, 1]);
  });

  it("draws the new colour when the system colour scheme changes", async () => {
    create("currentcolor");
    await nextFrame();
    const style = document.head.querySelector("style");
    if (style === null) throw new Error("no style element");
    style.textContent = "html { color: rgb(10, 20, 30) }";
    browser.mediaQuery("(prefers-color-scheme: dark)").change(true);
    await nextFrame();
    expect(lastClear()).toEqual([10 / 255, 20 / 255, 30 / 255, 1]);
  });

  it("does not draw again for a class change that keeps the colour", async () => {
    create("currentcolor");
    await nextFrame();
    document.documentElement.className = "other";
    await nextFrame();
    expect(browser.context().clears).toHaveLength(1);
  });

  it("hides the band while the context is lost and draws again on restore", async () => {
    const surface = create("rgb(1, 2, 3)");
    await nextFrame();
    const context = browser.context();

    const lost = context.loseContext();
    expect(lost.defaultPrevented).toBe(true);
    expect(surface.state).toBe("lost");
    expect(surface.canvas.style.visibility).toBe("hidden");

    context.restoreContext();
    expect(surface.state).toBe("lost");
    await nextFrame();
    expect(surface.state).toBe("ready");
    expect(context.clears).toHaveLength(2);
  });

  it("hides the band while forced colours are active", async () => {
    const surface = create("rgb(1, 2, 3)");
    await nextFrame();
    const forcedColors = browser.mediaQuery("(forced-colors: active)");
    forcedColors.change(true);
    expect(surface.canvas.style.visibility).toBe("hidden");
    forcedColors.change(false);
    expect(surface.canvas.style.visibility).toBe("");
  });

  it("allocates again for a new device pixel ratio", async () => {
    const surface = create("rgb(1, 2, 3)");
    await nextFrame();
    const before = surface.canvas.height;
    vi.stubGlobal("devicePixelRatio", 2);
    browser.mediaQuery("(resolution: 1dppx)").change(false);
    await nextFrame();
    expect(surface.canvas.height).toBe(before * 2);
    expect(browser.context().clears.at(-1)?.height).toBe(before * 2);
    expect(() => browser.mediaQuery("(resolution: 2dppx)")).not.toThrow();
  });

  it("measures and draws in the resize observer callback, before paint", async () => {
    create("rgb(1, 2, 3)");
    await nextFrame();
    vi.stubGlobal("devicePixelRatio", 3);
    browser.resize();
    expect(browser.context().clears).toHaveLength(2);
  });

  it("reads the colour again when the page comes back from the back-forward cache", async () => {
    create("currentcolor");
    await nextFrame();
    document.head.replaceChildren();
    const style = document.createElement("style");
    style.textContent = "html { color: rgb(7, 8, 9) }";
    document.head.append(style);
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    );
    await nextFrame();
    expect(lastClear()).toEqual([7 / 255, 8 / 255, 9 / 255, 1]);
  });

  it("frees the context and stops listening on destroy", async () => {
    const surface = create("currentcolor");
    await nextFrame();
    surface.destroy();
    expect(document.body.children).toHaveLength(0);
    expect(browser.context().lost).toBe(true);
    document.documentElement.className = "dark";
    browser.resize();
    await nextFrame();
    expect(browser.context().clears).toHaveLength(1);
  });
});
