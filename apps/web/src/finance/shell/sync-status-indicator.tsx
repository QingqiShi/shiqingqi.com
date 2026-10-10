"use client";

import { CircleNotchIcon } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { CloudArrowUpIcon } from "@phosphor-icons/react/dist/ssr/CloudArrowUp";
import { CloudCheckIcon } from "@phosphor-icons/react/dist/ssr/CloudCheck";
import { CloudSlashIcon } from "@phosphor-icons/react/dist/ssr/CloudSlash";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import {
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, controlSize, rhythm } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { displayMoment, displayTime } from "../domain/dates/display-moment.ts";
import type { SyncStatus } from "../replica/types.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useSyncStatus } from "../replica/use-sync-status.ts";

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function toneOf(status: SyncStatus): "quiet" | "busy" | "waiting" | "problem" {
  if (status.problem === "offline" || status.problem === "busy") {
    return "waiting";
  }
  if (status.problem) return "problem";
  if (status.pushProblem || status.pendingCount > 0) return "waiting";
  if (status.activity !== "idle") return "busy";
  return "quiet";
}

/**
 * Where the Replica stands against the server: synced, syncing, offline
 * with changes waiting, or a problem. `compact` shows the icon alone, and
 * only when there is something to say, for the mobile bar.
 */
export function SyncStatusIndicator({
  compact = false,
}: {
  compact?: boolean;
}) {
  const status = useSyncStatus();
  const { runtime } = useFinanceRuntime();
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
  let icon;
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

  if (compact && tone === "quiet") return null;

  const downloadFailing =
    (status.problem === "server" || status.problem === "busy") &&
    status.failures >= RETRY_AFTER_FAILURES;
  const pushFailing =
    status.problem === null &&
    (status.pushProblem === "server" || status.pushProblem === "busy") &&
    status.pushFailures >= RETRY_AFTER_FAILURES;
  const canRetry =
    !compact && status.activity === "idle" && (downloadFailing || pushFailing);

  return (
    <span css={[row.tight, styles.wrap]}>
      <span
        css={[
          typeRole.caption,
          typeModifier.numeric,
          styles.root,
          toneStyles[tone],
        ]}
        role="status"
      >
        <span css={[styles.icon, spinning && styles.spin]}>{icon}</span>
        <span css={compact ? a11y.srOnly : styles.label}>{label}</span>
      </span>
      {canRetry ? (
        <Button
          size="sm"
          look="ghost"
          onClick={() => {
            runtime.retry();
          }}
        >
          {t({ en: "Try again", zh: "重试" })}
        </Button>
      ) : null}
    </span>
  );
}

const spinKeyframes = stylex.keyframes({
  to: { transform: "rotate(360deg)" },
});

const RETRY_AFTER_FAILURES = 2;

const styles = stylex.create({
  wrap: {
    minInlineSize: 0,
  },
  root: {
    display: "inline-flex",
    alignItems: "center",
    gap: rhythm.inline,
    minInlineSize: 0,
  },
  icon: {
    display: "inline-flex",
    flexShrink: 0,
    fontSize: controlSize._4,
  },
  spin: {
    animationName: {
      default: spinKeyframes,
      [motionConstants.REDUCED_MOTION]: "none",
    },
    animationDuration: duration._1000,
    animationTimingFunction: easing.linear,
    animationIterationCount: "infinite",
  },
  label: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

const toneStyles = stylex.create({
  quiet: { color: color.fgMuted },
  busy: { color: color.fgMuted },
  waiting: { color: color.fgWarning },
  problem: { color: color.fgDanger },
});
