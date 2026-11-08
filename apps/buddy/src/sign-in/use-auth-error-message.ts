import { t } from "@tuja/i18n";
import type { BuddyApiError } from "../http/buddy-api-error.ts";

/** Turns a `BuddyApiError` into calm copy. A closed passkey sheet is not an error and has none. */
export function useAuthErrorMessage() {
  const messages: Record<string, string> = {
    sign_up_invalid: t({
      en: "This sign-up has expired or was used already. Ask for a new code on the sign-in page.",
      zh: "此注册已过期或已被使用。请在登录页重新获取验证码。",
    }),
    recovery_invalid: t({
      en: "This link has expired or was used already. Ask for a new code on the sign-in page.",
      zh: "此链接已过期或已被使用。请在登录页重新获取验证码。",
    }),
    email_registered: t({
      en: "An account uses this email already. If it is yours, sign in with your passkey, or get back in with your email on the sign-in page.",
      zh: "已有账号使用此邮箱。如果是你的账号，请用通行密钥登录，或在登录页通过邮箱重新进入。",
    }),
    passkey_unknown: t({
      en: "This passkey belongs to no Buddy account. Use another passkey, or sign up.",
      zh: "此通行密钥不属于任何搭子账号。请换一个通行密钥，或注册新账号。",
    }),
    passkey_invalid: t({
      en: "The passkey check did not go through. Try again.",
      zh: "通行密钥验证未通过，请重试。",
    }),
    challenge_invalid: t({
      en: "That took too long. Try again.",
      zh: "用时过长，请重试。",
    }),
    passkey_exists: t({
      en: "This passkey is registered already. Sign in with it.",
      zh: "此通行密钥已注册，可直接用它登录。",
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
    rate_limited: t({
      en: "Too many tries. Try again later.",
      zh: "尝试次数过多，请稍后再试。",
    }),
    not_configured: t({
      en: "Buddy is not set up on this server.",
      zh: "此服务器尚未配置搭子。",
    }),
  };
  const fallback = t({
    en: "Something went wrong. Try again.",
    zh: "出现问题，请重试。",
  });
  return ({ code }: BuddyApiError): string => messages[code] ?? fallback;
}
