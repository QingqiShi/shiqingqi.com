import { describe, expect, it } from "vitest";
import {
  isInstitutionDomain,
  parseInstitutionDomain,
} from "./parse-institution-domain.ts";

describe("parseInstitutionDomain", () => {
  it.each([
    ["barclays.co.uk", "barclays.co.uk"],
    ["  Wise.com ", "wise.com"],
    ["https://www.americanexpress.com/en-gb/", "americanexpress.com"],
  ])("reads %j as %j", (text, domain) => {
    expect(parseInstitutionDomain(text)).toBe(domain);
  });

  it.each([
    "my bank",
    "localhost",
    "127.0.0.1",
    "[::1]",
    "ftp://example.com",
    "https://user@example.com",
    "https://example.com:8443",
  ])("refuses %j", (text) => {
    expect(parseInstitutionDomain(text)).toBeNull();
  });
});

describe("isInstitutionDomain", () => {
  it("takes a lower-case host name and refuses an IP address or one label", () => {
    expect(isInstitutionDomain("nsandi.com")).toBe(true);
    expect(isInstitutionDomain("xn--fiqs8s.xn--fiqz9s")).toBe(true);
    expect(isInstitutionDomain("Barclays.co.uk")).toBe(false);
    expect(isInstitutionDomain("192.168.1.1")).toBe(false);
    expect(isInstitutionDomain("intranet")).toBe(false);
    expect(isInstitutionDomain(`${"a".repeat(250)}.com`)).toBe(false);
  });
});
