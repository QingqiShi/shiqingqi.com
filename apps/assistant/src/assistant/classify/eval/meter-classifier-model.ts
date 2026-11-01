import { wrapLanguageModel } from "ai";
import {
  getClassifierModel,
  type AssistantModel,
} from "#src/assistant/ai/get-classifier-model.ts";

/** Claude Haiku 5.5, US dollars per million tokens. */
const HAIKU_PRICE = {
  input: 0.1,
  cacheWrite: 0.125,
  cacheRead: 0.01,
  output: 0.5,
};

/** The classifier model, wrapped to count its calls and tokens for an eval's report. */
export function meterClassifierModel() {
  const base = getClassifierModel();
  if (!base || typeof base.model === "string") {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  const usage = { calls: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
  const model: AssistantModel = {
    id: base.id,
    model: wrapLanguageModel({
      model: base.model,
      middleware: {
        wrapGenerate: async ({ doGenerate }) => {
          const result = await doGenerate();
          usage.calls++;
          usage.input += result.usage.inputTokens.noCache ?? 0;
          usage.cacheWrite += result.usage.inputTokens.cacheWrite ?? 0;
          usage.cacheRead += result.usage.inputTokens.cacheRead ?? 0;
          usage.output += result.usage.outputTokens.total ?? 0;
          return result;
        },
      },
    }),
  };

  function summary() {
    const cost =
      (usage.input * HAIKU_PRICE.input +
        usage.cacheWrite * HAIKU_PRICE.cacheWrite +
        usage.cacheRead * HAIKU_PRICE.cacheRead +
        usage.output * HAIKU_PRICE.output) /
      1_000_000;
    return `${base?.id ?? ""}: ${String(usage.calls)} calls; tokens: input ${String(usage.input)}, output ${String(usage.output)}; cost $${cost.toFixed(4)}`;
  }

  return { model, summary };
}
