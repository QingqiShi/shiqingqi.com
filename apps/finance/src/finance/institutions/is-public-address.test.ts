import { describe, expect, it } from "vitest";
import { isPublicAddress } from "./is-public-address.ts";

describe("isPublicAddress", () => {
  it.each([
    ["8.8.8.8", 4],
    ["2606:4700:4700::1111", 6],
  ] as const)("allows the public address %s", (address, family) => {
    expect(isPublicAddress(address, family)).toBe(true);
  });

  it.each([
    ["10.0.0.1", 4],
    ["100.64.0.1", 4],
    ["127.0.0.1", 4],
    ["169.254.169.254", 4],
    ["172.16.0.1", 4],
    ["192.168.1.1", 4],
    ["::1", 6],
    ["::ffff:127.0.0.1", 6],
    ["::ffff:8.8.8.8", 6],
    ["64:ff9b::a00:1", 6],
    ["fc00::1", 6],
    ["fe80::1", 6],
    ["2002:7f00:1::1", 6],
  ] as const)("refuses the non-public address %s", (address, family) => {
    expect(isPublicAddress(address, family)).toBe(false);
  });

  it("refuses an address whose family does not match", () => {
    expect(isPublicAddress("8.8.8.8", 6)).toBe(false);
    expect(isPublicAddress("2606:4700:4700::1111", 4)).toBe(false);
    expect(isPublicAddress("example.com", 4)).toBe(false);
  });
});
