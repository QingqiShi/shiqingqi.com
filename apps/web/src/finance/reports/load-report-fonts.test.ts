import { describe, expect, it, vi } from "vitest";
import {
  createReportFontLoader,
  FIXED_CHARACTERS,
} from "./load-report-fonts.ts";

const FONT_URL = "https://fonts.gstatic.com/s/test/font.ttf";

function fakeFetch(options: { failFull?: boolean } = {}) {
  const calls: { url: string; signal: unknown }[] = [];
  const fetchImpl = (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    calls.push({ url, signal: init?.signal });
    if (url === FONT_URL) {
      return Promise.resolve(new Response(new Uint8Array([1, 2, 3])));
    }
    const isFull = !new URL(url).searchParams.has("text");
    if (isFull && options.failFull) {
      return Promise.resolve(new Response("busy", { status: 503 }));
    }
    return Promise.resolve(
      new Response(`src: url(${FONT_URL}) format('truetype');`),
    );
  };
  return { calls, fetchImpl };
}

function cssUrls(calls: readonly { url: string }[]) {
  return calls
    .map((call) => call.url)
    .filter((url) => url.startsWith("https://fonts.googleapis.com/"));
}

describe("createReportFontLoader", () => {
  it("asks for the fixed subset when the image holds only fixed characters", async () => {
    const { calls, fetchImpl } = fakeFetch();
    const load = createReportFontLoader(fetchImpl);

    const fonts = await load("Weekly report £1,234.56 净资产 10月4日");

    expect(fonts.map((font) => font.weight)).toEqual([400, 700]);
    for (const url of cssUrls(calls)) {
      expect(new URL(url).searchParams.get("text")).toBe(FIXED_CHARACTERS);
    }
    expect(calls.every((call) => call.signal instanceof AbortSignal)).toBe(
      true,
    );
  });

  it("never sends a Household name to Google Fonts", async () => {
    const { calls, fetchImpl } = fakeFetch();
    const load = createReportFontLoader(fetchImpl);

    await load("Weekly report Ocado 超市 Zoë");
    await load("Weekly report Ocado 超市 Zoë");

    const urls = cssUrls(calls);
    expect(urls).toHaveLength(2);
    for (const url of urls) {
      expect(new URL(url).searchParams.has("text")).toBe(false);
      expect(url).not.toMatch(/Ocado|%E8%B6%85|Zo/);
    }
  });

  it("falls back to the fixed subset when the whole family fails, and waits before trying it again", async () => {
    const { calls, fetchImpl } = fakeFetch({ failFull: true });
    const load = createReportFontLoader(fetchImpl);
    const quiet = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const fonts = await load("超市");
    const fullTries = cssUrls(calls).filter(
      (url) => !new URL(url).searchParams.has("text"),
    ).length;
    await load("超市");

    quiet.mockRestore();
    expect(fonts).toHaveLength(2);
    expect(
      cssUrls(calls).filter((url) => !new URL(url).searchParams.has("text")),
    ).toHaveLength(fullTries);
  });
});
