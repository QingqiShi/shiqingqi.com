import { describe, expect, it } from "vitest";
import { signInPath, safeNextPath } from "./sign-in-path.ts";

describe("signInPath", () => {
  it("keeps the locale prefix and the next path", () => {
    expect(signInPath("en", "/settings?id=1")).toBe(
      "/sign-in?next=%2Fsettings%3Fid%3D1",
    );
    expect(signInPath("zh", "/mail/a")).toBe("/zh/sign-in?next=%2Fmail%2Fa");
    expect(signInPath("zh", "/")).toBe("/zh/sign-in");
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/digest", "/digest"],
    ["/?x=1", "/?x=1"],
    [
      "/todos?url=https%3A%2F%2Fa.example%2Fb",
      "/todos?url=https%3A%2F%2Fa.example%2Fb",
    ],
    ["reports", "/"],
    ["//evil.example/digest", "/"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil", "/"],
    ["/\t/evil.example", "/"],
    ["/\n/evil.example", "/"],
    [null, "/"],
  ])("%s → %s", (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });
});
