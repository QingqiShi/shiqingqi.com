import { describe, expect, it } from "vitest";
import { isPublicAddress } from "./is-public-address.ts";

describe("isPublicAddress", () => {
  it.each([
    ["8.8.8.8", 4],
    ["1.1.1.1", 4],
    ["151.101.1.69", 4],
    ["2606:4700:4700::1111", 6],
    ["2a00:1450:4009:81f::200e", 6],
  ] as const)("allows the public address %s", (address, family) => {
    expect(isPublicAddress(address, family)).toBe(true);
  });

  it.each([
    ["0.0.0.0", 4],
    ["10.0.0.1", 4],
    ["100.64.0.1", 4],
    ["100.127.255.254", 4],
    ["127.0.0.1", 4],
    ["169.254.169.254", 4],
    ["172.16.0.1", 4],
    ["172.31.255.255", 4],
    ["192.0.0.8", 4],
    ["192.0.2.1", 4],
    ["192.168.1.1", 4],
    ["198.18.0.1", 4],
    ["198.51.100.1", 4],
    ["203.0.113.1", 4],
    ["224.0.0.1", 4],
    ["239.255.255.250", 4],
    ["240.0.0.1", 4],
    ["255.255.255.255", 4],
    ["::", 6],
    ["::1", 6],
    ["::ffff:127.0.0.1", 6],
    ["::ffff:10.0.0.1", 6],
    ["::ffff:8.8.8.8", 6],
    ["::127.0.0.1", 6],
    ["64:ff9b::a00:1", 6],
    ["fc00::1", 6],
    ["fd12:3456::1", 6],
    ["fe80::1", 6],
    ["fec0::1", 6],
    ["ff02::1", 6],
    ["2001:db8::1", 6],
    ["2001::1", 6],
    ["2002:7f00:1::1", 6],
    ["3fff::1", 6],
  ] as const)("refuses the non-public address %s", (address, family) => {
    expect(isPublicAddress(address, family)).toBe(false);
  });

  it("refuses an address whose family does not match", () => {
    expect(isPublicAddress("8.8.8.8", 6)).toBe(false);
    expect(isPublicAddress("2606:4700:4700::1111", 4)).toBe(false);
    expect(isPublicAddress("example.com", 4)).toBe(false);
  });
});
