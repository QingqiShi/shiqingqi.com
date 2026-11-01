import { t } from "@tuja/i18n";
import type { AssistantApiError } from "../http/assistant-api-error.ts";

/** Turns an `AssistantApiError` into calm copy. A closed passkey sheet is not an error and has none. */
export function useAuthErrorMessage() {
  const messages: Record<string, string> = {
    passkey_unknown: t({
      en: "This passkey belongs to no user of the assistant. Use another passkey.",
      zh: "此通行密钥不属于邮件助手的任何用户。请换一个通行密钥。",
    }),
    passkey_invalid: t({
      en: "The passkey check did not go through. Try again.",
      zh: "通行密钥验证未通过，请重试。",
    }),
    challenge_invalid: t({
      en: "The sign-in took too long. Try again.",
      zh: "登录用时过长，请重试。",
    }),
    not_configured: t({
      en: "The assistant is not set up on this server.",
      zh: "此服务器尚未配置邮件助手。",
    }),
  };
  const fallback = t({
    en: "Something went wrong. Try again.",
    zh: "出现问题，请重试。",
  });
  return ({ code }: AssistantApiError): string => messages[code] ?? fallback;
}
