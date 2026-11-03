import { describe, expect, it } from "vitest";
import { readLimitedText } from "./read-limited-text.ts";

const encoder = new TextEncoder();

describe("readLimitedText", () => {
  it("gives the text of a body up to the limit", async () => {
    const body = new Response("明天").body;

    expect(await readLimitedText(body, 6)).toBe("明天");
    expect(await readLimitedText(null, 6)).toBe("");
  });

  it("stops reading a body that does not end", async () => {
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(encoder.encode("x".repeat(1024)));
      },
    });

    expect(await readLimitedText(endless, 8 * 1024)).toBeNull();
  });
});
