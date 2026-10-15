import { describe, expect, it } from "vitest";
import { institutionIconUrl } from "./institution-icon-url.ts";

describe("institutionIconUrl", () => {
  it("gives no URL when the server has no icon for the domain", () => {
    expect(
      institutionIconUrl({
        institutionDomain: null,
        guessedInstitutionDomain: "scottishwidows.co.uk",
        institutionIconVersion: null,
      }),
    ).toBeUndefined();
  });

  it("gives no URL when the account has no domain", () => {
    expect(
      institutionIconUrl({
        institutionDomain: null,
        guessedInstitutionDomain: null,
        institutionIconVersion: null,
      }),
    ).toBeUndefined();
  });

  it("gives the URL of the icon of the domain the account shows, with its version", () => {
    expect(
      institutionIconUrl({
        institutionDomain: "monzo.com",
        guessedInstitutionDomain: "barclays.co.uk",
        institutionIconVersion: "0123456789abcdef",
      }),
    ).toBe("/api/finance/institution-icons/monzo.com?v=0123456789abcdef");
  });
});
