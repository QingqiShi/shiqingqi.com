import type { SupportedLocale } from "@tuja/i18n/types";
import { renderBuddyEmail } from "./render-buddy-email.ts";
import type { BuddyEmail } from "./types.ts";

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
      subject: (code: string) => `${code} is your Buddy recovery code`,
      heading: "Get back into Buddy",
      intro:
        "Someone asked to get back into Buddy with this email address. If it was you, use this code to save a new passkey. Your old passkeys then stop working, and every other device signs out.",
    },
    "sign-up": {
      subject: (code: string) => `${code} is your Buddy sign-up code`,
      heading: "Sign up for Buddy",
      intro:
        "Use this code to sign up for Buddy with this email address. You then save a passkey.",
      hint: "Type it on the device where you are signing up.",
      action: "Sign up",
    },
    "registered-sign-up": {
      subject: (code: string) => `${code} is your Buddy code`,
      heading: "You already use Buddy",
      intro:
        "Someone asked to sign up for Buddy with this email address, but you already have an account with it. Sign in with your passkey. If you lost it, use this code to save a new passkey. Your old passkeys then stop working, and every other device signs out.",
    },
    hint: "Type it on the device where you asked for it.",
    alternative: "Or open this link on any device:",
    action: "Save a new passkey",
    expiry: "The code and the link work once, for 30 minutes.",
  },
  zh: {
    recovery: {
      subject: (code: string) => `搭子恢复验证码：${code}`,
      heading: "重新进入搭子",
      intro:
        "有人使用此邮箱申请重新进入搭子。如果是你本人，请用此验证码保存新的通行密钥。之后旧的通行密钥将失效，其他设备都会退出登录。",
    },
    "sign-up": {
      subject: (code: string) => `搭子注册验证码：${code}`,
      heading: "注册搭子",
      intro: "请用此验证码以这个邮箱注册搭子。之后保存通行密钥即可。",
      hint: "请在你正在注册的设备上输入。",
      action: "注册",
    },
    "registered-sign-up": {
      subject: (code: string) => `搭子验证码：${code}`,
      heading: "你已在使用搭子",
      intro:
        "有人使用此邮箱申请注册搭子，但此邮箱已有账号。请用你的通行密钥登录。如果丢失了通行密钥，请用此验证码保存新的通行密钥。之后旧的通行密钥将失效，其他设备都会退出登录。",
    },
    hint: "请在你提出申请的设备上输入。",
    alternative: "也可以在任意设备上打开此链接：",
    action: "保存新的通行密钥",
    expiry: "验证码和链接都仅可使用一次，30 分钟内有效。",
  },
};

/**
 * A one-use code and its link. `"recovery"` goes to the account that has
 * this email, `"sign-up"` to a new address that asks to sign up, and
 * `"registered-sign-up"` answers a sign-up request for an address that an
 * account has already.
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
}): BuddyEmail {
  const copy = COPY[locale];
  const {
    subject,
    heading,
    intro,
    hint = copy.hint,
    action = copy.action,
  } = copy[reason];
  return renderBuddyEmail({
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
