import { CircleNotchIcon } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { CloudArrowUpIcon } from "@phosphor-icons/react/dist/ssr/CloudArrowUp";
import { CloudCheckIcon } from "@phosphor-icons/react/dist/ssr/CloudCheck";
import { CloudSlashIcon } from "@phosphor-icons/react/dist/ssr/CloudSlash";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import type { ReactNode } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { displayMoment, displayTime } from "../domain/dates/display-moment.ts";
import type { SyncStatus } from "../replica/types.ts";
import { useSyncStatus } from "../replica/use-sync-status.ts";

type SyncTone = "quiet" | "busy" | "waiting" | "problem";

interface SyncStatusSummary {
  status: SyncStatus;
  tone: SyncTone;
  label: string;
  icon: ReactNode;
  spinning: boolean;
  /**
   * The tone to mark away from the full status, or null. A problem, or
   * changes held back by one, is marked. Quiet, syncing, and changes that
   * only wait for the next push are not, so a mark does not flash on each
   * edit.
   */
  attention: "waiting" | "problem" | null;
}

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function toneOf(status: SyncStatus): SyncTone {
  if (status.problem === "offline" || status.problem === "busy") {
    return "waiting";
  }
  if (status.problem) return "problem";
  if (status.pushProblem || status.pendingCount > 0) return "waiting";
  if (status.activity !== "idle") return "busy";
  return "quiet";
}

/** Where the Replica stands against the server, as a tone, a label and an icon. */
export function useSyncStatusSummary(): SyncStatusSummary {
  const status = useSyncStatus();
  const locale = useLocale();
  const tone = toneOf(status);

  const pending =
    status.pendingCount === 1
      ? t({ en: "1 change to sync", zh: "1 项更改待同步" })
      : `${new Intl.NumberFormat(locale).format(status.pendingCount)} ${t({
          en: "changes to sync",
          zh: "项更改待同步",
        })}`;
  const syncedAt = status.lastSyncedAt
    ? isToday(status.lastSyncedAt)
      ? displayTime(status.lastSyncedAt, locale)
      : displayMoment(status.lastSyncedAt, locale)
    : null;

  let label: string;
  let icon: ReactNode;
  if (status.problem === "offline") {
    label =
      status.pendingCount > 0
        ? `${t({ en: "Offline", zh: "离线" })} · ${pending}`
        : t({ en: "Offline", zh: "离线" });
    icon = <CloudSlashIcon weight="bold" role="presentation" />;
  } else if (status.problem === "server") {
    label = t({ en: "Can't reach the server", zh: "无法连接服务器" });
    icon = <WarningCircleIcon weight="bold" role="presentation" />;
  } else if (
    status.problem === "busy" ||
    (status.problem === null && status.pushProblem === "busy")
  ) {
    label = t({
      en: "Server busy · trying again soon",
      zh: "服务器繁忙 · 稍后自动重试",
    });
    icon = <CloudArrowUpIcon weight="bold" role="presentation" />;
  } else if (status.problem === "unauthorised") {
    label = t({ en: "Signed out", zh: "已退出登录" });
    icon = <WarningCircleIcon weight="bold" role="presentation" />;
  } else if (status.problem === "not-configured") {
    label = t({ en: "Sync is not set up", zh: "同步尚未配置" });
    icon = <WarningCircleIcon weight="bold" role="presentation" />;
  } else if (status.problem === "storage") {
    label = t({ en: "Can't save on this device", zh: "无法保存到本设备" });
    icon = <WarningCircleIcon weight="bold" role="presentation" />;
  } else if (status.pushProblem) {
    label = t({
      en: "Changes not sent · trying again soon",
      zh: "更改未发送 · 稍后自动重试",
    });
    icon = <CloudArrowUpIcon weight="bold" role="presentation" />;
  } else if (status.activity === "bootstrapping") {
    label = t({ en: "Downloading your data…", zh: "正在下载数据…" });
    icon = <CircleNotchIcon weight="bold" role="presentation" />;
  } else if (status.pendingCount > 0) {
    label = pending;
    icon = <CloudArrowUpIcon weight="bold" role="presentation" />;
  } else if (status.activity !== "idle") {
    label = t({ en: "Syncing…", zh: "正在同步…" });
    icon = <CircleNotchIcon weight="bold" role="presentation" />;
  } else if (syncedAt) {
    label = `${t({ en: "Synced", zh: "已同步" })} ${syncedAt}`;
    icon = <CloudCheckIcon weight="bold" role="presentation" />;
  } else {
    label = t({ en: "Not synced yet", zh: "尚未同步" });
    icon = <CloudArrowUpIcon weight="bold" role="presentation" />;
  }

  const spinning =
    status.activity !== "idle" && !status.problem && status.pendingCount === 0;
  const attention =
    (status.problem !== null || status.pushProblem !== null) &&
    (tone === "waiting" || tone === "problem")
      ? tone
      : null;

  return { status, tone, label, icon, spinning, attention };
}
