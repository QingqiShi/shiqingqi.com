import { describe, it, expect, beforeEach } from "vitest";
import { setLocale, getLocale } from "./server-locale";

describe("server locale", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("defaults to en", () => {
    expect(getLocale()).toBe("en");
  });

  it("can set and get locale", () => {
    setLocale("zh");
    expect(getLocale()).toBe("zh");
  });

  it("round-trips correctly", () => {
    setLocale("zh");
    expect(getLocale()).toBe("zh");
    setLocale("en");
    expect(getLocale()).toBe("en");
  });
});
