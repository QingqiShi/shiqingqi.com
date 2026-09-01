import type { SupportedLocale } from "../../types";
import { sendConversation } from "./send-conversation";
import type { ChatResponse } from "./types";

export async function sendMessage(
  input: string,
  locale: SupportedLocale = "en",
): Promise<ChatResponse> {
  const [response] = await sendConversation([{ content: input }], locale);
  return response;
}
