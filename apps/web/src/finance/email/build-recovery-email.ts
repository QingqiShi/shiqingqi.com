import type { SupportedLocale } from "#src/i18n/types.ts";
import { renderFinanceEmail } from "./render-finance-email.ts";
import type { FinanceEmail } from "./types.ts";

interface RecoveryLink {
  householdName: string;
  url: string;
}

const COPY = {
  en: {
    subject: (code: string) => `${code} is your Finance recovery code`,
    heading: "Get back into Finance",
    intro:
      "Someone asked to get back into Finance with this email address. If it was you, use this code to save a new passkey. Your old passkeys then stop working, and every other device signs out.",
    hint: "Type it on the device where you asked for it.",
    alternative: "Or open the link for your household, on any device:",
    action: "Save a new passkey",
    expiry: "The code and each link work once, for 30 minutes.",
  },
  zh: {
    subject: (code: string) => `家庭账本恢复验证码：${code}`,
    heading: "重新进入家庭账本",
    intro:
      "有人使用此邮箱申请重新进入家庭账本。如果是你本人，请用此验证码保存新的通行密钥。之后旧的通行密钥将失效，其他设备都会退出登录。",
    hint: "请在你提出申请的设备上输入。",
    alternative: "也可以在任意设备上打开你家庭对应的链接：",
    action: "保存新的通行密钥",
    expiry: "验证码和每个链接都仅可使用一次，30 分钟内有效。",
  },
} satisfies Record<SupportedLocale, unknown>;

/** One email with a recovery code and a Recovery link for each household of the users who have this Recovery email. */
export function buildRecoveryEmail({
  to,
  locale,
  code,
  links,
}: {
  to: string;
  locale: SupportedLocale;
  code: string;
  links: RecoveryLink[];
}): FinanceEmail {
  const copy = COPY[locale];
  return renderFinanceEmail({
    to,
    locale,
    subject: copy.subject(code),
    heading: copy.heading,
    intro: copy.intro,
    code: {
      value: code,
      hint: copy.hint,
      alternative: copy.alternative,
    },
    actions: links.map((link) => ({
      heading: link.householdName,
      label: copy.action,
      url: link.url,
    })),
    expiry: copy.expiry,
  });
}
