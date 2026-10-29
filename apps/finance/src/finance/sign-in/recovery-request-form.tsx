"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Text } from "@tuja/ui/components/text";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import { EmailCodeForm } from "./email-code-form.tsx";

/**
 * Asks for a recovery email, then for its code, which opens the user's
 * Recovery link. The answers do not say whether a user has the address.
 */
export function RecoveryRequestForm() {
  const locale = useLocale();
  const sentPrefix = t({
    en: "If ",
    zh: "如果 ",
  });
  const sentSuffix = t({
    en: " is a confirmed recovery email, we sent a code to it. Enter it below, or open the link in the email. Both work for 30 minutes.",
    zh: " 是已确认的恢复邮箱，我们已向它发送验证码。请在下方输入，或打开邮件中的链接。两者 30 分钟内有效。",
  });

  return (
    <EmailCodeForm
      intro={
        <Text tone="muted" look="bodySmall">
          {t({
            en: "Enter your recovery email. If it is confirmed for Finance, we send you a code to save a new passkey. Your old passkeys then stop working.",
            zh: "输入你的恢复邮箱。如果该邮箱已在家庭账本中确认，我们会发送验证码，供你保存新的通行密钥。之后旧的通行密钥将失效。",
          })}
        </Text>
      }
      label={t({ en: "Recovery email", zh: "恢复邮箱" })}
      submitLabel={t({ en: "Email me a code", zh: "发送验证码到邮箱" })}
      sentMessage={(email) => `${sentPrefix}${email}${sentSuffix}`}
      send={(email, sendLocale) =>
        financePasskeyClient.requestRecovery(email, sendLocale)
      }
      verify={async (code) => {
        const path = await financePasskeyClient.checkRecoveryCode(code);
        window.location.assign(getLocalePath(path, locale));
      }}
    />
  );
}
