"use client";

import { t } from "@tuja/i18n";

/**
 * Why a mailbox must be connected again, from the code that the account
 * keeps, in one sentence. Each place that asks for a new connect says it in
 * these words, so one cause reads the same everywhere.
 */
export function ReconnectCause({ code }: { code: string | null | undefined }) {
  switch (code) {
    case "login_refused":
      return t({
        en: "The mail server refused the login.",
        zh: "邮件服务器拒绝了登录。",
      });
    case "token_revoked":
      return t({
        en: "Access was withdrawn or has expired.",
        zh: "授权已撤销或过期。",
      });
    case "credential_unreadable":
      return t({
        en: "The saved login can no longer be read.",
        zh: "保存的登录信息无法读取。",
      });
    default:
      return t({
        en: "The assistant can no longer sign in to it.",
        zh: "助手已无法登录这个邮箱。",
      });
  }
}
