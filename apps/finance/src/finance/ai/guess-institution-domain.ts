import { anthropic } from "@ai-sdk/anthropic";
import { generateText, isStepCount, tool, type LanguageModel } from "ai";
import { z } from "zod";
import { parseInstitutionDomain } from "../domain/accounts/parse-institution-domain.ts";

const MAX_SEARCHES = 2;
const MAX_STEPS = 2;
const MAX_OUTPUT_TOKENS = 2000;
const REPORT_TOOL = "report_domain";

/** What the model may use besides the name: the account's money tells a UK Chase from a US one. */
export interface InstitutionHints {
  baseCurrency: string;
  accountCurrency: string;
}

const INSTRUCTIONS = `You find the official website domain of a financial institution from the name a person typed for one of their accounts in a household finance app.

People type loose names: nicknames and abbreviations (Amex, T212, IBKR, NS&I), often with product words after the name (ISA, GIA, SIPP, LISA, BA, Avios, Saver, 信用卡 = credit card, 储蓄 = savings, 期权 = stock options, 股票 = shares). Drop the product words and find the institution behind the name. A product that one institution sells, such as Premium Bonds, belongs to that institution.

Most people who use the app live in the United Kingdom. When the institution runs a separate UK website on its own domain, answer that domain (for example barclays.co.uk, not barclays.com). The household's base currency and the account's currency are hints about the country.

Answer the registrable domain of the institution's main public website only: no scheme, no path, no "www." (for example americanexpress.com).

Answer null when the name is not one institution: an account or product type alone (SIPP, ISA, Pension, 退休金, Savings), an asset class (Crypto, Gold, Cash), a place, a person, a lock or a house, or a name you cannot tie to one institution with confidence.

Newer and smaller institutions often use a domain that is not the obvious guess (.co, .io, .bank, a short form). Unless you know the exact domain well, search the web to confirm it. Always finish by calling ${REPORT_TOOL} once.`;

const reportDomainTool = tool({
  description:
    "Reports the institution's website domain, or null when the name is not an institution.",
  inputSchema: z.object({
    domain: z
      .string()
      .nullable()
      .describe("A registrable domain such as example.co.uk, or null"),
  }),
});

function describeName(name: string, hints: InstitutionHints) {
  return [
    `Name: ${JSON.stringify(name)}`,
    `Household base currency: ${hints.baseCurrency}`,
    `Account currency: ${hints.accountCurrency}`,
  ].join("\n");
}

/**
 * Asks the model, which may search the web, for the website domain of the
 * institution in `name`. Null means the name is not an institution. Throws
 * when the call fails or the model gives no answer, so that the caller can
 * ask again later.
 */
export async function guessInstitutionDomain(
  model: LanguageModel,
  name: string,
  hints: InstitutionHints,
  signal?: AbortSignal,
): Promise<string | null> {
  const result = await generateText({
    model,
    abortSignal: signal,
    instructions: INSTRUCTIONS,
    messages: [{ role: "user", content: describeName(name, hints) }],
    tools: {
      web_search: anthropic.tools.webSearch_20250305({
        maxUses: MAX_SEARCHES,
        userLocation: { type: "approximate", country: "GB" },
      }),
      [REPORT_TOOL]: reportDomainTool,
    },
    stopWhen: isStepCount(MAX_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });
  const report = result.steps
    .flatMap((step) => step.toolCalls)
    .find((call) => call.toolName === REPORT_TOOL);
  if (!report) throw new Error("The model did not report a domain");
  const { domain } = z
    .object({ domain: z.string().nullable() })
    .parse(report.input);
  return domain === null ? null : parseInstitutionDomain(domain);
}
