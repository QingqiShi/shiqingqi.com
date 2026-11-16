"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { withNext } from "@tuja/server-auth/sign-in-path";
import { Text } from "@tuja/ui/components/text";
import { passkeyClient } from "../passkey-client.ts";
import { EmailCodeForm } from "./email-code-form.tsx";

/**
 * Asks for the user's email, then for its code, which opens the user's
 * recovery link. The answers do not say whether a user has the address.
 */
export function RecoveryRequestForm({
  next,
}: {
  /** Where to go after the recovery, without a locale. */
  next: string;
}) {
  const locale = useLocale();
  const sentPrefix = t({
    en: "If ",
    zh: "如果 ",
  });
  const sentSuffix = t({
    en: " belongs to an account, we sent a code to it. Enter it below, or open the link in the email. Both work for 30 minutes.",
    zh: " 属于某个账号，我们已向它发送验证码。请在下方输入，或打开邮件中的链接。两者 30 分钟内有效。",
  });

  return (
    <EmailCodeForm
      intro={
        <Text tone="muted" look="bodySmall">
          {t({
            en: "Enter the email of your account. We send you a code to save a new passkey. Your old passkeys then stop working.",
            zh: "输入你账号的邮箱。我们会发送验证码，供你保存新的通行密钥。之后旧的通行密钥将失效。",
          })}
        </Text>
      }
      label={t({ en: "Email", zh: "邮箱" })}
      submitLabel={t({ en: "Email me a code", zh: "发送验证码到邮箱" })}
      sentMessage={(email) => `${sentPrefix}${email}${sentSuffix}`}
      send={(email, sendLocale) =>
        passkeyClient.requestRecovery(email, sendLocale, next)
      }
      verify={async (code) => {
        const path = await passkeyClient.checkRecoveryCode(code);
        window.location.assign(withNext(getLocalePath(path, locale), next));
      }}
    />
  );
}
