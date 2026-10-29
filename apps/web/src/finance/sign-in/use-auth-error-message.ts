import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import type { FinanceApiError } from "../http/finance-api-error.ts";
import { formatRetryWait } from "./format-retry-wait.ts";

/** Turns a `FinanceApiError` into calm copy. A refusal by a rate limit says how long to wait. A closed passkey sheet is not an error and has none. */
export function useAuthErrorMessage() {
  const locale = useLocale();
  const messages: Record<string, string> = {
    sign_up_invalid: t({
      en: "This sign-up has expired or was used already. Ask for a new code on the sign-in page.",
      zh: "此注册已过期或已被使用。请在登录页重新获取验证码。",
    }),
    email_registered: t({
      en: "Someone already uses Finance with this email. If it is you, sign in with your passkey, or get back in with your recovery email on the sign-in page.",
      zh: "已有人用此邮箱使用家庭账本。如果是你本人，请用通行密钥登录，或在登录页通过恢复邮箱重新进入。",
    }),
    passkey_unknown: t({
      en: "This passkey is not registered for Finance. Use another passkey, or ask for an invite.",
      zh: "此通行密钥未在家庭账本中注册。请换一个通行密钥，或请家人发送邀请。",
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
    member_claimed: t({
      en: "Someone has joined as this member already. If it was you, sign in.",
      zh: "已有人以该成员身份加入。如果是你，请直接登录。",
    }),
    owner_only: t({
      en: "Only the household owner can do this.",
      zh: "只有家庭所有者可以这样做。",
    }),
    no_membership: t({
      en: "This passkey belongs to no household. Ask for an invite.",
      zh: "此通行密钥不属于任何家庭。请家人发送邀请。",
    }),
    email_invalid: t({
      en: "That does not look like an email address.",
      zh: "这不像是一个邮箱地址。",
    }),
    email_not_configured: t({
      en: "This server cannot send email yet.",
      zh: "此服务器暂时无法发送邮件。",
    }),
    email_failed: t({
      en: "The email did not go out. Try again in a minute.",
      zh: "邮件未能发出，请稍后再试。",
    }),
    code_invalid: t({
      en: "That code is not right. Check the email and try again.",
      zh: "验证码不正确。请核对邮件后重试。",
    }),
    code_expired: t({
      en: "That code no longer works. Ask for a new one.",
      zh: "该验证码已失效。请重新获取。",
    }),
    demo_not_found: t({
      en: "The demo is not available right now.",
      zh: "演示暂时无法使用。",
    }),
    not_configured: t({
      en: "Finance is not set up on this server.",
      zh: "此服务器尚未配置家庭账本。",
    }),
  };
  const fallback = t({
    en: "Something went wrong. Try again.",
    zh: "出现问题，请重试。",
  });
  const rateLimited = t({
    en: "Too many tries. Try again later.",
    zh: "尝试次数过多，请稍后再试。",
  });
  const waitPrefix = t({
    en: "Too many tries. Try again in about ",
    zh: "尝试次数过多，请约 ",
  });
  const waitSuffix = t({ en: ".", zh: "后再试。" });
  return ({ code, retryAfterSeconds }: FinanceApiError): string => {
    if (code !== "rate_limited") return messages[code] ?? fallback;
    return retryAfterSeconds === null
      ? rateLimited
      : `${waitPrefix}${formatRetryWait(retryAfterSeconds, locale)}${waitSuffix}`;
  };
}
