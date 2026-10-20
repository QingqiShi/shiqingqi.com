import type { SupportedLocale } from "#src/i18n/types.ts";
import { renderFinanceEmail } from "./render-finance-email.ts";
import type { FinanceEmail } from "./types.ts";

const COPY = {
  en: {
    subject: (code: string) => `${code} is your Finance sign-up code`,
    heading: "Sign up for Finance",
    intro:
      "Use this code to sign up for Finance with this email address. You then give your name and save a passkey.",
    hint: "Type it on the device where you are signing up.",
    alternative: "Or open this link on any device:",
    action: "Sign up",
    expiry: "The code and the link work once, for 30 minutes.",
  },
  zh: {
    subject: (code: string) => `家庭账本注册验证码：${code}`,
    heading: "注册家庭账本",
    intro:
      "请用此验证码以这个邮箱注册家庭账本。之后填写你的名字并保存通行密钥。",
    hint: "请在你正在注册的设备上输入。",
    alternative: "也可以在任意设备上打开此链接：",
    action: "注册",
    expiry: "验证码和链接都仅可使用一次，30 分钟内有效。",
  },
} satisfies Record<SupportedLocale, unknown>;

export function buildSignUpEmail({
  to,
  locale,
  code,
  url,
}: {
  to: string;
  locale: SupportedLocale;
  code: string;
  url: string;
}): FinanceEmail {
  const copy = COPY[locale];
  return renderFinanceEmail({
    to,
    locale,
    subject: copy.subject(code),
    heading: copy.heading,
    intro: copy.intro,
    code: { value: code, hint: copy.hint, alternative: copy.alternative },
    action: { label: copy.action, url },
    expiry: copy.expiry,
  });
}
