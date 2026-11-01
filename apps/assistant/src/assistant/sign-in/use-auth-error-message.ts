import { t } from "@tuja/i18n";
import type { AssistantApiError } from "../http/assistant-api-error.ts";

/** Turns an `AssistantApiError` into calm copy. A closed passkey sheet is not an error and has none. */
export function useAuthErrorMessage() {
  const messages: Record<string, string> = {
    passkey_unknown: t({
      en: "This passkey belongs to no user of the assistant. Use another passkey, or ask for an invite.",
      zh: "此通行密钥不属于邮件助手的任何用户。请换一个通行密钥，或申请邀请链接。",
    }),
    passkey_invalid: t({
      en: "The passkey check did not go through. Try again.",
      zh: "通行密钥验证未通过，请重试。",
    }),
    challenge_invalid: t({
      en: "The sign-in took too long. Try again.",
      zh: "登录用时过长，请重试。",
    }),
    passkey_exists: t({
      en: "This passkey is registered already. Sign in with it.",
      zh: "此通行密钥已注册，可直接用它登录。",
    }),
    invite_invalid: t({
      en: "This invite has expired or was used already.",
      zh: "此邀请已过期或已被使用。",
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
