import { t } from "#src/i18n.ts";

/** Turns a `FinanceApiError` code into calm copy. A closed passkey sheet is not an error and has none. */
// eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- the i18n transform adds a useI18nTranslations hook call to each function that calls t(), so the prefix is earned; the rule only sees the pre-transform source
export function useAuthErrorMessage() {
  const messages: Record<string, string> = {
    setup_forbidden: t({
      en: "That setup secret does not match.",
      zh: "设置口令不正确。",
    }),
    setup_closed: t({
      en: "Finance is set up already. Sign in, or ask for an invite.",
      zh: "家庭账本已设置完成。请登录，或请家人发送邀请。",
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
    rate_limited: t({
      en: "Too many tries. Wait a minute, then try again.",
      zh: "尝试次数过多，请稍等一分钟再试。",
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
  return (code: string): string => messages[code] ?? fallback;
}
