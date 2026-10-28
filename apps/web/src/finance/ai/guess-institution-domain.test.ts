import { describe, expect, it } from "vitest";
import { guessInstitutionDomain } from "./guess-institution-domain.ts";
import { createDomainModel } from "./testing/create-domain-model.ts";

const HINTS = { baseCurrency: "GBP", accountCurrency: "USD" };

describe("guessInstitutionDomain", () => {
  it("returns the reported domain as a bare domain", async () => {
    const model = createDomainModel("https://www.Barclays.co.uk/");
    expect(await guessInstitutionDomain(model, "Barclay", HINTS)).toBe(
      "barclays.co.uk",
    );
  });

  it("returns null when the name is not an institution, or the answer is not a domain", async () => {
    expect(
      await guessInstitutionDomain(createDomainModel(null), "SIPP", HINTS),
    ).toBeNull();
    expect(
      await guessInstitutionDomain(
        createDomainModel("not a domain"),
        "Lock 17",
        HINTS,
      ),
    ).toBeNull();
  });
});
