import type { SupportedLocale } from "#src/i18n/types.ts";
import { renderFinanceEmail } from "./render-finance-email.ts";
import type { FinanceEmail } from "./types.ts";

type CodeEmailReason = "recovery" | "sign-up" | "registered-sign-up";

const COPY: Record<
  SupportedLocale,
  Record<
    CodeEmailReason,
    {
      subject: (code: string) => string;
      heading: string;
      intro: string;
      hint?: string;
      action?: string;
    }
  > & {
    hint: string;
    alternative: string;
    action: string;
    expiry: string;
  }
> = {
  en: {
    recovery: {
      subject: (code: string) => `${code} is your Finance recovery code`,
      heading: "Get back into Finance",
      intro:
        "Someone asked to get back into Finance with this email address. If it was you, use this code to save a new passkey. Your old passkeys then stop working, and every other device signs out.",
    },
    "sign-up": {
      subject: (code: string) => `${code} is your Finance sign-up code`,
      heading: "Sign up for Finance",
      intro:
        "Use this code to sign up for Finance with this email address. You then give your name and save a passkey.",
      hint: "Type it on the device where you are signing up.",
      action: "Sign up",
    },
    "registered-sign-up": {
      subject: (code: string) => `${code} is your Finance code`,
      heading: "You already use Finance",
      intro:
        "Someone asked to sign up for Finance with this email address, but you already use Finance with it. Sign in with your passkey. If you lost it, use this code to save a new passkey. Your old passkeys then stop working, and every other device signs out.",
    },
    hint: "Type it on the device where you asked for it.",
    alternative: "Or open this link on any device:",
    action: "Save a new passkey",
    expiry: "The code and the link work once, for 30 minutes.",
  },
  zh: {
    recovery: {
      subject: (code: string) => `家庭账本恢复验证码：${code}`,
      heading: "重新进入家庭账本",
      intro:
        "有人使用此邮箱申请重新进入家庭账本。如果是你本人，请用此验证码保存新的通行密钥。之后旧的通行密钥将失效，其他设备都会退出登录。",
    },
    "sign-up": {
      subject: (code: string) => `家庭账本注册验证码：${code}`,
      heading: "注册家庭账本",
      intro:
        "请用此验证码以这个邮箱注册家庭账本。之后填写你的名字并保存通行密钥。",
      hint: "请在你正在注册的设备上输入。",
      action: "注册",
    },
    "registered-sign-up": {
      subject: (code: string) => `家庭账本验证码：${code}`,
      heading: "你已在使用家庭账本",
      intro:
        "有人使用此邮箱申请注册家庭账本，但你已在用此邮箱使用家庭账本。请用你的通行密钥登录。如果丢失了通行密钥，请用此验证码保存新的通行密钥。之后旧的通行密钥将失效，其他设备都会退出登录。",
    },
    hint: "请在你提出申请的设备上输入。",
    alternative: "也可以在任意设备上打开此链接：",
    action: "保存新的通行密钥",
    expiry: "验证码和链接都仅可使用一次，30 分钟内有效。",
  },
};

/**
 * A one-use code and its link. `"recovery"` goes to the user who has this
 * Recovery email, `"sign-up"` to a new address that asks to sign up, and
 * `"registered-sign-up"` answers a sign-up request for a Recovery email that
 * a user already has.
 */
export function buildCodeEmail({
  to,
  locale,
  code,
  url,
  reason = "recovery",
}: {
  to: string;
  locale: SupportedLocale;
  code: string;
  url: string;
  reason?: CodeEmailReason;
}): FinanceEmail {
  const copy = COPY[locale];
  const {
    subject,
    heading,
    intro,
    hint = copy.hint,
    action = copy.action,
  } = copy[reason];
  return renderFinanceEmail({
    to,
    locale,
    subject: subject(code),
    heading,
    intro,
    code: { value: code, hint, alternative: copy.alternative },
    action: { label: action, url },
    expiry: copy.expiry,
  });
}
