"use client";

import * as stylex from "@stylexjs/stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import {
  financePasskeyClient,
  type RecoveryChoice,
} from "../auth/finance-passkey-client.ts";
import { EmailCodeForm } from "./email-code-form.tsx";

/**
 * Asks for a recovery email, then for its code, which opens the Recovery
 * link of the user's household. The answers do not say whether a user has
 * the address.
 */
export function RecoveryRequestForm() {
  const locale = useLocale();
  const [choices, setChoices] = useState<RecoveryChoice[] | null>(null);
  const sentPrefix = t({
    en: "If ",
    zh: "如果 ",
  });
  const sentSuffix = t({
    en: " is a confirmed recovery email, we sent a code to it. Enter it below, or open a link in the email. Both work for 30 minutes.",
    zh: " 是已确认的恢复邮箱，我们已向它发送验证码。请在下方输入，或打开邮件中的链接。两者 30 分钟内有效。",
  });

  if (choices !== null) {
    return (
      <div css={stack.item}>
        <Text tone="muted" look="bodySmall">
          {t({
            en: "This email is the recovery email for more than one household. Choose the one to get back into.",
            zh: "此邮箱是多个家庭的恢复邮箱。请选择要重新进入的家庭。",
          })}
        </Text>
        {choices.map((choice) => (
          <AnchorButton
            key={choice.path}
            href={getLocalePath(choice.path, locale)}
            look="outline"
            css={styles.wide}
          >
            {choice.householdName}
          </AnchorButton>
        ))}
      </div>
    );
  }

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
        const found = await financePasskeyClient.checkRecoveryCode(code);
        if (found.length === 1) {
          window.location.assign(getLocalePath(found[0].path, locale));
        } else {
          setChoices(found);
        }
      }}
    />
  );
}

const styles = stylex.create({
  wide: {
    inlineSize: "100%",
  },
});
