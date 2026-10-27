import { afterEach, describe, expect, it, vi } from "vitest";
import { makeCanvas } from "./make-canvas";

const PNG_BLOB = new Blob([], { type: "image/png" });

function stubOffscreenCanvas(ctx: unknown) {
  const convertToBlob = vi.fn().mockResolvedValue(PNG_BLOB);
  const constructed: { width: number; height: number }[] = [];
  class FakeOffscreenCanvas {
    constructor(width: number, height: number) {
      constructed.push({ width, height });
    }
    getContext() {
      return ctx;
    }
    convertToBlob = convertToBlob;
  }
  vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas);
  return { constructed, convertToBlob };
}

/** Replace the DOM canvas's 2D context, which jsdom leaves unimplemented. */
function stubDomCanvasContext(ctx: unknown): () => void {
  const proto = HTMLCanvasElement.prototype;
  const original = Object.getOwnPropertyDescriptor(proto, "getContext");
  Object.defineProperty(proto, "getContext", {
    configurable: true,
    value: () => ctx,
  });
  return () => {
    if (original === undefined) return;
    Object.defineProperty(proto, "getContext", original);
  };
}

describe("makeCanvas", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it("prefers OffscreenCanvas and exposes the canvas as a drawImage source", async () => {
    const ctx = {};
    const { constructed, convertToBlob } = stubOffscreenCanvas(ctx);

    const handle = makeCanvas(4, 6);

    expect(constructed).toEqual([{ width: 4, height: 6 }]);
    expect(handle?.ctx).toBe(ctx);
    expect(handle?.canvas).toBeInstanceOf(OffscreenCanvas);
    await expect(handle?.toBlob()).resolves.toBe(PNG_BLOB);
    expect(convertToBlob).toHaveBeenCalledWith({ type: "image/png" });
    handle?.cleanup();
    expect(document.body.querySelector("canvas")).toBeNull();
  });

  it("falls back to a hidden DOM canvas that cleanup removes", () => {
    stubOffscreenCanvas(null);
    const ctx = {};
    const restore = stubDomCanvasContext(ctx);

    const handle = makeCanvas(8, 8);

    expect(handle?.ctx).toBe(ctx);
    const canvas = document.body.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas?.width).toBe(8);
    expect(canvas?.style.position).toBe("fixed");
    expect(handle?.canvas).toBe(canvas);

    handle?.cleanup();

    expect(document.body.querySelector("canvas")).toBeNull();
    restore();
  });

  it("returns null and leaves no canvas behind when no 2D context exists", () => {
    stubOffscreenCanvas(null);
    const restore = stubDomCanvasContext(null);

    expect(makeCanvas(8, 8)).toBeNull();
    expect(document.body.querySelector("canvas")).toBeNull();
    restore();
  });
});
