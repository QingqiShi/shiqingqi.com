"use client";

import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { downloadBlob } from "#src/browser/download-blob.ts";
import { t } from "#src/i18n.ts";
import { useReplicaStore } from "../replica/use-replica-store.ts";
import { useReplica } from "../replica/use-replica.ts";
import { buildReplicaExport } from "./build-replica-export.ts";
import { SettingsPanel } from "./settings-panel.tsx";

/** Downloads everything on this device as one JSON file. */
export function DataSettings() {
  const store = useReplicaStore();
  const outboxCount = useReplica((snapshot) => snapshot.outboxCount);

  function exportJson() {
    const now = new Date();
    const document = buildReplicaExport(store.getSnapshot(), now);
    downloadBlob(
      new Blob([JSON.stringify(document)], { type: "application/json" }),
      `finance-export-${now.toISOString().slice(0, 10)}.json`,
    );
  }

  return (
    <SettingsPanel
      title={t({ en: "Data", zh: "数据" })}
      description={t({
        en: "A copy of every account, balance, transaction and setting this device holds, as JSON.",
        zh: "此设备上所有账户、余额、交易和设置的副本，JSON 格式。",
      })}
    >
      <div css={stack.tight}>
        <div>
          <Button
            icon={<DownloadSimpleIcon weight="bold" />}
            onClick={exportJson}
          >
            {t({ en: "Export JSON", zh: "导出 JSON" })}
          </Button>
        </div>
        {outboxCount > 0 ? (
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Includes changes this device has not synced yet.",
              zh: "包含此设备尚未同步的修改。",
            })}
          </Text>
        ) : null}
      </div>
    </SettingsPanel>
  );
}
