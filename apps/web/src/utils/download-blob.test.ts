import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "./download-blob";

describe("downloadBlob", () => {
  const createObjectURL = vi.fn(() => "blob:fake-url");
  const revokeObjectURL = vi.fn();
  const clicked: HTMLAnchorElement[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      // The anchor is in the document only for the duration of the click.
      const anchor = document.body.querySelector("a");
      if (anchor !== null) clicked.push(anchor);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    clicked.length = 0;
  });

  it("clicks a hidden anchor carrying the object URL and filename", () => {
    const blob = new Blob(["hello"], { type: "text/plain" });

    downloadBlob(blob, "greeting.txt");

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toHaveLength(1);
    expect(clicked[0].getAttribute("href")).toBe("blob:fake-url");
    expect(clicked[0].download).toBe("greeting.txt");
    expect(clicked[0].style.display).toBe("none");
  });

  it("removes the anchor from the document", () => {
    downloadBlob(new Blob(["x"]), "x.txt");

    expect(document.body.querySelector("a")).toBeNull();
  });

  it("defers revoking the object URL so the download can start", () => {
    downloadBlob(new Blob(["x"]), "x.txt");

    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });
});
