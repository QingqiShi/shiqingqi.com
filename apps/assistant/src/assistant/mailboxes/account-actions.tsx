"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { assistantFetch } from "../http/assistant-fetch.ts";

/** Check now, and remove with a second press to confirm. */
export function AccountActions({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"check" | "remove" | null>(null);
  const [confirming, setConfirming] = useState(false);

  function run(kind: "check" | "remove", path: string, method: string) {
    setBusy(kind);
    assistantFetch(path, { method })
      .catch(() => undefined)
      .finally(() => {
        setBusy(null);
        setConfirming(false);
        router.refresh();
      });
  }

  const checkLabel = t({ en: "Check now", zh: "立即检查" });
  const removeLabel = confirming
    ? t({ en: "Remove from the app", zh: "确认从应用中移除" })
    : t({ en: "Remove", zh: "移除" });

  return (
    <div css={cluster.tight}>
      <Button
        size="sm"
        look="ghost"
        icon={<ArrowClockwiseIcon weight="bold" />}
        hideLabelOnMobile
        aria-label={checkLabel}
        loading={busy === "check"}
        disabled={busy !== null}
        onClick={() => {
          run("check", `/api/accounts/${accountId}/check`, "POST");
        }}
      >
        {checkLabel}
      </Button>
      <Button
        size="sm"
        look={confirming ? "danger" : "ghost"}
        icon={<TrashIcon weight="bold" />}
        hideLabelOnMobile
        aria-label={removeLabel}
        loading={busy === "remove"}
        disabled={busy !== null}
        onClick={() => {
          if (!confirming) {
            setConfirming(true);
            return;
          }
          run("remove", `/api/accounts/${accountId}`, "DELETE");
        }}
      >
        {removeLabel}
      </Button>
    </div>
  );
}
