"use client";

import { KeyIcon } from "@phosphor-icons/react/dist/ssr/Key";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { PasswordConnectForm } from "./password-connect-form.tsx";

/** The other way to connect Gmail, for when Google keeps asking to connect again: a button that opens the app password form in a sheet. */
export function GmailPasswordConnect() {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        look="ghost"
        icon={<KeyIcon weight="bold" />}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true);
        }}
      >
        {t({ en: "Use a Gmail app password", zh: "用 Gmail 应用专用密码" })}
      </Button>
      <Sheet
        isOpen={open}
        onClose={close}
        closeLabel={t({ en: "Close", zh: "关闭" })}
        title={t({
          en: "Gmail with an app password",
          zh: "用应用专用密码连接 Gmail",
        })}
      >
        <div css={stack.item}>
          <Text as="p" look="bodySmall" tone="muted">
            {t({
              en: "Use this if Google keeps asking you to connect Gmail again.",
              zh: "如果 Google 总是要求重新连接 Gmail，可以改用这种方式。",
            })}
          </Text>
          <PasswordConnectForm provider="gmail" onConnected={close} />
        </div>
      </Sheet>
    </>
  );
}
