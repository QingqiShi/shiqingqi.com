import { describe, expect, it } from "vitest";
import { institutionFieldsAfter } from "./institution-fields-after.ts";
import { institutionNameKey } from "./institution-name-key.ts";
import {
  isInstitutionDomain,
  parseInstitutionDomain,
} from "./parse-institution-domain.ts";

describe("parseInstitutionDomain", () => {
  it.each([
    ["barclays.co.uk", "barclays.co.uk"],
    ["  Wise.com ", "wise.com"],
    ["www.natwest.com", "natwest.com"],
    ["https://www.americanexpress.com/en-gb/", "americanexpress.com"],
    ["http://monument.co", "monument.co"],
  ])("reads %j as %j", (text, domain) => {
    expect(parseInstitutionDomain(text)).toBe(domain);
  });

  it.each([
    "",
    "my bank",
    "localhost",
    "127.0.0.1",
    "[::1]",
    "https://10.0.0.1/",
    "ftp://example.com",
    "https://user@example.com",
    "https://example.com:8443",
    "example",
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

describe("institutionNameKey", () => {
  it("ignores case, width and spacing", () => {
    expect(institutionNameKey("  IBKR   ISA ")).toBe("ibkr isa");
    expect(institutionNameKey("ＡＭＥＸ")).toBe("amex");
  });
});

describe("institutionFieldsAfter", () => {
  const guessed = { institution: "Barclay" };

  it("drops the guess when the institution changes", () => {
    expect(institutionFieldsAfter(guessed, { institution: "Wise" })).toEqual({
      guessedInstitutionDomain: null,
    });
  });

  it("keeps the guess when the institution stays the same or is not part of the change", () => {
    expect(institutionFieldsAfter(guessed, { institution: "Barclay" })).toEqual(
      {},
    );
    expect(institutionFieldsAfter(guessed, {})).toEqual({});
  });
});
