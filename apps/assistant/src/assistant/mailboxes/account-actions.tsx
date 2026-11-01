"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { assistantFetch } from "../http/assistant-fetch.ts";

/** Sync now, and remove with a second press to confirm. */
export function AccountActions({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"sync" | "remove" | null>(null);
  const [confirming, setConfirming] = useState(false);

  function run(kind: "sync" | "remove", path: string, method: string) {
    setBusy(kind);
    assistantFetch(path, { method })
      .catch(() => undefined)
      .finally(() => {
        setBusy(null);
        setConfirming(false);
        router.refresh();
      });
  }

  return (
    <div css={cluster.tight}>
      <Button
        size="sm"
        look="outline"
        loading={busy === "sync"}
        disabled={busy !== null}
        onClick={() => {
          run("sync", `/api/accounts/${accountId}/sync`, "POST");
        }}
      >
        {t({ en: "Sync now", zh: "立即同步" })}
      </Button>
      <Button
        size="sm"
        look={confirming ? "danger" : "ghost"}
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
        {confirming
          ? t({ en: "Remove from the app", zh: "确认从应用中移除" })
          : t({ en: "Remove", zh: "移除" })}
      </Button>
    </div>
  );
}
