import { describe, expect, it } from "vitest";
import { guessInstitutionDomain } from "./guess-institution-domain.ts";
import { createDomainModel } from "./testing/create-domain-model.ts";
import { userText } from "./testing/mock-usage.ts";

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

  it("throws when the model answers without reporting", async () => {
    await expect(
      guessInstitutionDomain(createDomainModel(undefined), "Wise", HINTS),
    ).rejects.toThrow("did not report");
  });

  it("sends the name with both currencies, a web search limited to the UK, and the report tool", async () => {
    const model = createDomainModel("wise.com");
    await guessInstitutionDomain(model, 'Wise "USD"', HINTS);

    const [call] = model.doGenerateCalls;
    expect(userText(call.prompt)).toBe(
      'Name: "Wise \\"USD\\""\nHousehold base currency: GBP\nAccount currency: USD',
    );
    const tools = call.tools ?? [];
    expect(
      tools.map((tool) => (tool.type === "provider" ? tool.id : tool.name)),
    ).toEqual(["anthropic.web_search_20250305", "report_domain"]);
    expect(tools.find((tool) => tool.type === "provider")?.args).toMatchObject({
      maxUses: 2,
      userLocation: { type: "approximate", country: "GB" },
    });
  });
});
