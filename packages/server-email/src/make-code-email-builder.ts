import type { SupportedLocale } from "@tuja/i18n/types";
import { renderEmail } from "./render-email.ts";
import type { Email } from "./types.ts";

type CodeEmailReason = "recovery" | "sign-up" | "registered-sign-up";

const COPY: Record<
  SupportedLocale,
  Record<
    CodeEmailReason,
    {
      subject: (app: string, code: string) => string;
      heading: (app: string) => string;
      intro: (app: string) => string;
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
      subject: (app, code) => `${code} is your ${app} recovery code`,
      heading: (app) => `Get back into ${app}`,
      intro: (app) =>
        `Someone asked to get back into ${app} with this email address. If it was you, use this code to save a new passkey. Your old passkeys then stop working, and every other device signs out.`,
    },
    "sign-up": {
      subject: (app, code) => `${code} is your ${app} sign-up code`,
      heading: (app) => `Sign up for ${app}`,
      intro: (app) =>
        `Use this code to sign up for ${app} with this email address. You then save a passkey.`,
      hint: "Type it on the device where you are signing up.",
      action: "Sign up",
    },
    "registered-sign-up": {
      subject: (app, code) => `${code} is your ${app} code`,
      heading: (app) => `You already use ${app}`,
      intro: (app) =>
        `Someone asked to sign up for ${app} with this email address, but you already have an account with it. Sign in with your passkey. If you lost it, use this code to save a new passkey. Your old passkeys then stop working, and every other device signs out.`,
    },
    hint: "Type it on the device where you asked for it.",
    alternative: "Or open this link on any device:",
    action: "Save a new passkey",
    expiry: "The code and the link work once, for 30 minutes.",
  },
  zh: {
    recovery: {
      subject: (app, code) => `${app}恢复验证码：${code}`,
      heading: (app) => `重新进入${app}`,
      intro: (app) =>
        `有人使用此邮箱申请重新进入${app}。如果是你本人，请用此验证码保存新的通行密钥。之后旧的通行密钥将失效，其他设备都会退出登录。`,
    },
    "sign-up": {
      subject: (app, code) => `${app}注册验证码：${code}`,
      heading: (app) => `注册${app}`,
      intro: (app) =>
        `请用此验证码以这个邮箱注册${app}。之后保存通行密钥即可。`,
      hint: "请在你正在注册的设备上输入。",
      action: "注册",
    },
    "registered-sign-up": {
      subject: (app, code) => `${app}验证码：${code}`,
      heading: (app) => `你已在使用${app}`,
      intro: (app) =>
        `有人使用此邮箱申请注册${app}，但此邮箱已有账号。请用你的通行密钥登录。如果丢失了通行密钥，请用此验证码保存新的通行密钥。之后旧的通行密钥将失效，其他设备都会退出登录。`,
    },
    hint: "请在你提出申请的设备上输入。",
    alternative: "也可以在任意设备上打开此链接：",
    action: "保存新的通行密钥",
    expiry: "验证码和链接都仅可使用一次，30 分钟内有效。",
  },
};

/**
 * Builds an app's email with a one-use code and its link. `"recovery"` goes
 * to the user who has this email, `"sign-up"` to a new address that asks to
 * sign up, and `"registered-sign-up"` answers a sign-up request for an
 * address that a user has already.
 */
export function makeCodeEmailBuilder(
  /** The app's name in each locale. */
  appName: Record<SupportedLocale, string>,
) {
  return function buildCodeEmail({
    to,
    locale,
    code,
    url,
    reason,
  }: {
    to: string;
    locale: SupportedLocale;
    code: string;
    url: string;
    reason: CodeEmailReason;
  }): Email {
    const copy = COPY[locale];
    const app = appName[locale];
    const {
      subject,
      heading,
      intro,
      hint = copy.hint,
      action = copy.action,
    } = copy[reason];
    return renderEmail({
      wordmark: app,
      to,
      locale,
      subject: subject(app, code),
      heading: heading(app),
      intro: intro(app),
      code: { value: code, hint, alternative: copy.alternative },
      action: { label: action, url },
      expiry: copy.expiry,
    });
  };
}
