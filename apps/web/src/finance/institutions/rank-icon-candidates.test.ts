import { describe, expect, it } from "vitest";
import {
  rankIconCandidates,
  rootIconCandidates,
} from "./rank-icon-candidates.ts";

const PAGE = new URL("https://www.example.com/en/home");

describe("rankIconCandidates", () => {
  it("puts .ico last, then larger sizes, then the more trusted source", () => {
    const at = (path: string) => new URL(path, PAGE);
    const ranked = rankIconCandidates([
      { url: at("/favicon.ico"), size: 256, source: "favicon-ico" },
      { url: at("/i32.png"), size: 32, source: "icon" },
      { url: at("/m512.png"), size: 512, source: "manifest" },
      { url: at("/a180.png"), size: 180, source: "apple-touch-icon" },
      { url: at("/i180.png"), size: 180, source: "icon" },
      ...rootIconCandidates(PAGE),
    ]);
    expect(ranked.map(({ url }) => url.pathname)).toEqual([
      "/m512.png",
      "/a180.png",
      "/apple-touch-icon.png",
      "/i180.png",
      "/i32.png",
      "/favicon.ico",
    ]);
  });
});
