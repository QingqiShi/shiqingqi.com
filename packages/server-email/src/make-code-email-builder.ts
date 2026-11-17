import type { SupportedLocale } from "@tuja/i18n/types";
import { renderEmail } from "./render-email.ts";
import type { Email } from "./types.ts";

type LinkReason = "recovery" | "sign-up" | "registered-sign-up";
type CodeEmailReason = LinkReason | "email-change";

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
      expiry?: string;
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
    "email-change": {
      subject: (app, code) => `${code} is your ${app} email code`,
      heading: () => "Confirm your email",
      intro: (app) =>
        `Someone signed in to ${app} asked to use this email address for their account. If it was you, type this code in ${app}.`,
      expiry: "The code works once, for 30 minutes.",
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
    "email-change": {
      subject: (app, code) => `${app}邮箱验证码：${code}`,
      heading: () => "确认你的邮箱",
      intro: (app) =>
        `有人在${app}中申请将此邮箱用于其账号。如果是你本人，请在${app}中输入此验证码。`,
      expiry: "验证码仅可使用一次，30 分钟内有效。",
    },
    hint: "请在你提出申请的设备上输入。",
    alternative: "也可以在任意设备上打开此链接：",
    action: "保存新的通行密钥",
    expiry: "验证码和链接都仅可使用一次，30 分钟内有效。",
  },
};

/**
 * Builds an app's email with a one-use code, and its link when the flow has
 * one. `"recovery"` goes to the user who has this email, `"sign-up"` to a new
 * address that asks to sign up, `"registered-sign-up"` answers a sign-up
 * request for an address that a user has already, and `"email-change"` goes
 * to the new address of a signed-in user, with no link.
 */
export function makeCodeEmailBuilder(
  /** The app's name in each locale. */
  appName: Record<SupportedLocale, string>,
) {
  return function buildCodeEmail(
    input: {
      to: string;
      locale: SupportedLocale;
      code: string;
    } & ({ url: string; reason: LinkReason } | { reason: "email-change" }),
  ): Email {
    const { to, locale, code, reason } = input;
    const copy = COPY[locale];
    const app = appName[locale];
    const {
      subject,
      heading,
      intro,
      hint = copy.hint,
      action = copy.action,
      expiry = copy.expiry,
    } = copy[reason];
    return renderEmail({
      wordmark: app,
      to,
      locale,
      subject: subject(app, code),
      heading: heading(app),
      intro: intro(app),
      code: { value: code, hint, alternative: copy.alternative },
      action: "url" in input ? { label: action, url: input.url } : undefined,
      expiry,
    });
  };
}
