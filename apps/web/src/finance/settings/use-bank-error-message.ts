import { t } from "#src/i18n.ts";

/** Turns a Bank link's `lastError` code into a sentence for the household; null stays null. */
// eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- the i18n transform adds a useI18nTranslations hook call to each function that calls t(), so the prefix is earned; the rule only sees the pre-transform source
export function useBankErrorMessage(): (code: string | null) => string | null {
  const messages: Record<string, string> = {
    reconnect: t({
      en: "The bank connection expired. Reconnect it in Lunch Flow.",
      zh: "银行连接已过期。请在 Lunch Flow 重新连接。",
    }),
    auth: t({
      en: "Lunch Flow refused the API key. The owner can replace it in Connections.",
      zh: "Lunch Flow 拒绝了 API 密钥。所有者可在“银行连接”中更换。",
    }),
    not_found: t({
      en: "Lunch Flow no longer has this bank account. Link another one.",
      zh: "Lunch Flow 中已没有这个银行账户。请关联其他账户。",
    }),
    unavailable: t({
      en: "Lunch Flow or the bank did not answer. The next sync tries again.",
      zh: "Lunch Flow 或银行没有响应。下次同步会再试。",
    }),
    rate_limited: t({
      en: "The bank allows only a few syncs a day. The next sync tries again.",
      zh: "银行每天只允许同步几次。下次同步会再试。",
    }),
  };
  const fallback = t({
    en: "The last sync failed. The next sync tries again.",
    zh: "上次同步失败。下次同步会再试。",
  });
  return (code) => (code === null ? null : (messages[code] ?? fallback));
}
