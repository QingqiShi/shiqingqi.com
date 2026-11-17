import {
  renderEmail,
  type EmailContent,
} from "@tuja/server-email/render-email";
import type { Email } from "@tuja/server-email/types";
import { FINANCE_NAME } from "./finance-name.ts";

/** An email under the Finance wordmark. A Household name in it is user input, and the layout escapes every value. */
export function renderFinanceEmail(
  content: Omit<EmailContent, "wordmark">,
): Email {
  return renderEmail({ ...content, wordmark: FINANCE_NAME[content.locale] });
}
