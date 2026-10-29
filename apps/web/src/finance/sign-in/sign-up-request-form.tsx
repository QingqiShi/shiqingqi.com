"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { financePasskeyClient } from "../auth/finance-passkey-client.ts";
import { EmailCodeForm } from "./email-code-form.tsx";

/** Asks for a sign-up code by email. The code, or the emailed link, opens the sign-up page. */
export function SignUpRequestForm() {
  const locale = useLocale();
  const sentPrefix = t({
    en: "We sent a code to ",
    zh: "我们已向 ",
  });
  const sentSuffix = t({
    en: ". Enter it below, or open the link in the email.",
    zh: " 发送验证码。请在下方输入，或打开邮件中的链接。",
  });
  return (
    <EmailCodeForm
      intro={
        <div css={stack.text}>
          <Heading level={2} look="h3">
            {t({ en: "New to Finance?", zh: "第一次使用家庭账本？" })}
          </Heading>
          <Text tone="muted" look="bodySmall">
            {t({
              en: "Enter your email. We send you a code to sign up and save a passkey.",
              zh: "输入你的邮箱。我们会发送验证码，供你注册并保存通行密钥。",
            })}
          </Text>
        </div>
      }
      label={t({ en: "Email", zh: "邮箱" })}
      submitLabel={t({
        en: "Email me a sign-up code",
        zh: "发送注册验证码到邮箱",
      })}
      sentMessage={(email) => `${sentPrefix}${email}${sentSuffix}`}
      send={(email, sendLocale) =>
        financePasskeyClient.requestSignUp(email, sendLocale)
      }
      verify={async (code) => {
        const path = await financePasskeyClient.checkSignUpCode(code);
        window.location.assign(getLocalePath(path, locale));
      }}
    />
  );
}
