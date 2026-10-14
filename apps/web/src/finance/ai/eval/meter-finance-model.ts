import {
  wrapLanguageModel,
  type LanguageModel,
  type LanguageModelMiddleware,
} from "ai";
import {
  getFinanceModel,
  getInstitutionDomainModel,
} from "../get-finance-model.ts";

interface Price {
  input: number;
  cacheWrite: number;
  cacheRead: number;
  output: number;
  search: number;
}

/** Claude Sonnet 5.5, US dollars per million tokens, and per web search. */
const SONNET_PRICE: Price = {
  input: 2,
  cacheWrite: 2.5,
  cacheRead: 0.2,
  output: 10,
  search: 0.01,
};

/** Claude Haiku 5.5, in the units of {@link SONNET_PRICE}. */
const HAIKU_PRICE: Price = {
  input: 0.1,
  cacheWrite: 0.125,
  cacheRead: 0.01,
  output: 0.5,
  search: 0.01,
};

type Generated = Awaited<
  ReturnType<NonNullable<LanguageModelMiddleware["wrapGenerate"]>>
>;

/** The finance model, wrapped to count its calls, tokens and web searches for an eval's report. */
export function meterFinanceModel(onGenerate?: (result: Generated) => void) {
  return meterModel(getFinanceModel(), SONNET_PRICE, onGenerate);
}

/** The institution domain model, metered as {@link meterFinanceModel} meters its model. */
export function meterInstitutionDomainModel() {
  return meterModel(getInstitutionDomainModel(), HAIKU_PRICE);
}

function meterModel(
  base: LanguageModel | null,
  price: Price,
  onGenerate?: (result: Generated) => void,
) {
  if (!base || typeof base === "string") {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  const usage = {
    calls: 0,
    input: 0,
    cacheWrite: 0,
    cacheRead: 0,
    output: 0,
    searches: 0,
  };
  const model = wrapLanguageModel({
    model: base,
    middleware: {
      wrapGenerate: async ({ doGenerate }) => {
        const result = await doGenerate();
        usage.calls++;
        usage.input += result.usage.inputTokens.noCache ?? 0;
        usage.cacheWrite += result.usage.inputTokens.cacheWrite ?? 0;
        usage.cacheRead += result.usage.inputTokens.cacheRead ?? 0;
        usage.output += result.usage.outputTokens.total ?? 0;
        usage.searches += result.content.filter(
          (part) => part.type === "tool-call" && part.toolName === "web_search",
        ).length;
        onGenerate?.(result);
        return result;
      },
    },
  });

  /** In US dollars. */
  function cost() {
    return (
      (usage.input * price.input +
        usage.cacheWrite * price.cacheWrite +
        usage.cacheRead * price.cacheRead +
        usage.output * price.output) /
        1_000_000 +
      usage.searches * price.search
    );
  }

  function summary() {
    return `${String(usage.calls)} model calls, ${String(usage.searches)} searches; tokens: input ${String(usage.input)}, cache write ${String(usage.cacheWrite)}, cache read ${String(usage.cacheRead)}, output ${String(usage.output)}; cost $${cost().toFixed(4)}`;
  }

  return { model, cost, summary };
}
