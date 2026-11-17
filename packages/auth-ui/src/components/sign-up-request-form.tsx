"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { withNext } from "@tuja/server-auth/sign-in-path";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { passkeyClient } from "../passkey-client.ts";
import { EmailCodeForm } from "./email-code-form.tsx";

/** Asks for a sign-up code by email. The code, or the emailed link, opens the sign-up page. */
export function SignUpRequestForm({
  next,
  note,
}: {
  /** Where to go after the sign-up, without a locale. */
  next: string;
  /** A sentence about what a new user gets in this app, after the shared text. */
  note?: string;
}) {
  const locale = useLocale();
  const noteGap = t({ en: " ", zh: "" });
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
            {t({ en: "No account yet?", zh: "还没有账号？" })}
          </Heading>
          <Text tone="muted" look="bodySmall">
            {t({
              en: "Enter your email. We send you a code to sign up and save a passkey.",
              zh: "输入你的邮箱。我们会发送验证码，供你注册并保存通行密钥。",
            })}
            {note ? `${noteGap}${note}` : null}
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
        passkeyClient.requestSignUp(email, sendLocale, next)
      }
      verify={async (code) => {
        const path = await passkeyClient.checkSignUpCode(code);
        window.location.assign(withNext(getLocalePath(path, locale), next));
      }}
    />
  );
}
