"use client";

import { t } from "@tuja/i18n";
import { Callout } from "@tuja/ui/components/callout";
import { Switch } from "@tuja/ui/components/switch";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { assistantFetch } from "../http/assistant-fetch.ts";

/** Lets the app file inbox mail into folders. Off until the user turns it on. */
export function OrganiseToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div css={stack.tight}>
      <Switch
        label={t({ en: "Organise my inbox", zh: "整理我的收件箱" })}
        description={t({
          en: "It runs every 30 minutes, moves spam to Junk and tidies your folders. Mail stays unread, and nothing is ever deleted or sent. The first runs go through your whole inbox.",
          zh: "每 30 分钟运行一次，还会把垃圾邮件移到垃圾邮件箱并整理文件夹。邮件保持未读，也从不删除或发送邮件。最初几次会处理你现有的整个收件箱。",
        })}
        value={enabled ? "on" : "off"}
        disabled={busy}
        onChange={(next) => {
          const wanted = next === "on";
          setBusy(true);
          setFailed(false);
          assistantFetch("/api/settings/organise", {
            method: "PUT",
            body: JSON.stringify({ enabled: wanted }),
          })
            .then(() => {
              setEnabled(wanted);
              router.refresh();
            })
            .catch(() => {
              setFailed(true);
            })
            .finally(() => {
              setBusy(false);
            });
        }}
      />
      {failed ? (
        <Callout intent="danger" role="alert">
          {t({
            en: "That did not work. Try again.",
            zh: "没有成功，请重试。",
          })}
        </Callout>
      ) : null}
    </div>
  );
}
