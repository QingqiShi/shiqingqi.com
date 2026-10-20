import type { SupportedLocale } from "#src/i18n/types.ts";
import { renderFinanceEmail } from "./render-finance-email.ts";
import type { FinanceEmail } from "./types.ts";

type RecoveryReason = "recovery" | "sign-up";

const COPY = {
  en: {
    recovery: {
      subject: (code: string) => `${code} is your Finance recovery code`,
      heading: "Get back into Finance",
      intro:
        "Someone asked to get back into Finance with this email address. If it was you, use this code to save a new passkey. Your old passkeys then stop working, and every other device signs out.",
    },
    "sign-up": {
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
} satisfies Record<
  SupportedLocale,
  Record<
    RecoveryReason,
    { subject: (code: string) => string; heading: string; intro: string }
  > & {
    hint: string;
    alternative: string;
    action: string;
    expiry: string;
  }
>;

/**
 * The recovery code and the Recovery link for the user who has this Recovery
 * email. With `reason: "sign-up"` it answers a sign-up request for that
 * address.
 */
export function buildRecoveryEmail({
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
  reason?: RecoveryReason;
}): FinanceEmail {
  const copy = COPY[locale];
  const { subject, heading, intro } = copy[reason];
  return renderFinanceEmail({
    to,
    locale,
    subject: subject(code),
    heading,
    intro,
    code: { value: code, hint: copy.hint, alternative: copy.alternative },
    action: { label: copy.action, url },
    expiry: copy.expiry,
  });
}
