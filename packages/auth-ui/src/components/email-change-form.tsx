"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { passkeyClient } from "../passkey-client.ts";
import { EmailCodeForm } from "./email-code-form.tsx";

/**
 * The email of the signed-in user, and the way to set or change it: a code
 * goes to the new address, and the user types it here.
 */
export function EmailChangeForm({ email }: { email: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [changedTo, setChangedTo] = useState<string | null>(null);
  const sentPrefix = t({
    en: "We sent a code to ",
    zh: "我们已向 ",
  });
  const sentSuffix = t({
    en: ". Enter it below. It works for 30 minutes.",
    zh: " 发送验证码。请在下方输入，30 分钟内有效。",
  });
  const changedPrefix = t({
    en: "Your email is now ",
    zh: "你的邮箱已改为 ",
  });
  const changedSuffix = t({ en: ".", zh: "。" });

  return (
    <div css={[stack.item, styles.column]}>
      <Text look="body">
        {email ?? t({ en: "No email yet.", zh: "还没有邮箱。" })}
      </Text>
      {changedTo === null ? null : (
        <Callout intent="success" role="status">
          {`${changedPrefix}${changedTo}${changedSuffix}`}
        </Callout>
      )}
      {open ? (
        <EmailCodeForm
          intro={
            <Text tone="muted" look="bodySmall">
              {t({
                en: "We send a code to the new address, to check that it is yours.",
                zh: "我们会向新邮箱发送验证码，以确认邮箱属于你。",
              })}
            </Text>
          }
          label={
            email === null
              ? t({ en: "Email", zh: "邮箱" })
              : t({ en: "New email", zh: "新邮箱" })
          }
          submitLabel={t({ en: "Email me a code", zh: "发送验证码到邮箱" })}
          sentMessage={(address) => `${sentPrefix}${address}${sentSuffix}`}
          send={(address, sendLocale) =>
            passkeyClient.requestEmailChange(address, sendLocale)
          }
          verify={async (code) => {
            const changed = await passkeyClient.confirmEmailChange(code);
            setChangedTo(changed);
            setOpen(false);
            router.refresh();
          }}
          messages={{
            email_registered: t({
              en: "Another account uses this email. Use a different one.",
              zh: "另一个账号正在使用此邮箱。请换一个邮箱。",
            }),
          }}
          onCancel={() => {
            setOpen(false);
          }}
        />
      ) : (
        <div>
          <Button
            look="outline"
            onClick={() => {
              setChangedTo(null);
              setOpen(true);
            }}
          >
            {email === null
              ? t({ en: "Add an email", zh: "添加邮箱" })
              : t({ en: "Change email", zh: "更改邮箱" })}
          </Button>
        </div>
      )}
    </div>
  );
}

const styles = stylex.create({
  column: {
    maxInlineSize: "32rem",
  },
});
