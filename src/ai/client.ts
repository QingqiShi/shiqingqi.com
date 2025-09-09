import OpenAI from "openai";

let _openaiClient: OpenAI | null = null;
let _openaiModel: string | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    _openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openaiClient;
}

export function getOpenAIModel(): string {
  if (!_openaiModel) {
    if (!process.env.OPENAI_MODEL) {
      throw new Error("OPENAI_MODEL is not set");
    }
    _openaiModel = process.env.OPENAI_MODEL;
  }
  return _openaiModel;
}
