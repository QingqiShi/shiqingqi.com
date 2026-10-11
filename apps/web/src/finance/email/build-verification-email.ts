import type { SupportedLocale } from "#src/i18n/types.ts";
import { renderFinanceEmail } from "./render-finance-email.ts";
import type { FinanceEmail } from "./types.ts";

const COPY = {
  en: {
    subject: "Confirm your Finance recovery email",
    heading: "Confirm your recovery email",
    intro:
      "Confirm this address so that Finance can send you a recovery link if you lose every passkey.",
    action: "Confirm email",
    expiry: "The link works once, for 1 hour.",
  },
  zh: {
    subject: "确认家庭账本恢复邮箱",
    heading: "确认你的恢复邮箱",
    intro:
      "确认此邮箱后，如果你丢失了全部通行密钥，家庭账本可以把恢复链接发到这里。",
    action: "确认邮箱",
    expiry: "链接仅可使用一次，1 小时内有效。",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export function buildVerificationEmail({
  to,
  locale,
  url,
}: {
  to: string;
  locale: SupportedLocale;
  url: string;
}): FinanceEmail {
  const { action, ...copy } = COPY[locale];
  return renderFinanceEmail({
    ...copy,
    to,
    locale,
    actions: [{ label: action, url }],
  });
}
