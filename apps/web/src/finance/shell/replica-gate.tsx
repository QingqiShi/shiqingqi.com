"use client";

import { CloudSlashIcon } from "@phosphor-icons/react/dist/ssr/CloudSlash";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color, controlSize, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useReplica } from "../replica/use-replica.ts";
import { useSyncStatus } from "../replica/use-sync-status.ts";

/** Failed downloads in a row before the screen stops waiting and says so. */
const BOOTSTRAP_FAILURES_BEFORE_NOTICE = 2;

/**
 * Shows the screens once this device holds the Household's data. Before
 * that, the screens show skeletons; when the first download cannot happen
 * (offline) or keeps failing, a notice with Retry takes their place, so a
 * skeleton never waits forever.
 */
export function ReplicaGate({ children }: { children: ReactNode }) {
  const loaded = useReplica((snapshot) => snapshot.loaded);
  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);
  const status = useSyncStatus();
  const { runtime } = useFinanceRuntime();

  const offline = status.problem === "offline";
  const failing =
    status.problem !== null &&
    status.problem !== "unauthorised" &&
    (status.failures >= BOOTSTRAP_FAILURES_BEFORE_NOTICE ||
      status.problem === "not-configured");
  if (!loaded || bootstrapped || !(offline || failing)) return children;

  return (
    <section
      css={[stack.item, styles.notice]}
      aria-labelledby="finance-download-heading"
    >
      <span css={[styles.icon, offline ? styles.muted : styles.danger]}>
        {offline ? (
          <CloudSlashIcon weight="bold" role="presentation" />
        ) : (
          <WarningCircleIcon weight="bold" role="presentation" />
        )}
      </span>
      <div css={stack.tight}>
        <Heading level={1} look="h3" id="finance-download-heading">
          {offline
            ? t({ en: "You're offline", zh: "当前处于离线状态" })
            : t({
                en: "Couldn't download your data",
                zh: "无法下载你的数据",
              })}
        </Heading>
        <Text as="p" tone="muted">
          {offline
            ? t({
                en: "This device has no copy of your data yet. It downloads as soon as you're back online.",
                zh: "本设备还没有你的数据，恢复联网后会立即下载。",
              })
            : t({
                en: "The server didn't answer. Your data is safe; try again in a moment.",
                zh: "服务器没有响应。你的数据是安全的，请稍后重试。",
              })}
        </Text>
      </div>
      <div>
        <Button
          look="primary"
          onClick={() => {
            runtime.retry();
          }}
          disabled={status.activity !== "idle"}
        >
          {status.activity === "idle"
            ? t({ en: "Try again", zh: "重试" })
            : t({ en: "Downloading…", zh: "正在下载…" })}
        </Button>
      </div>
    </section>
  );
}

const styles = stylex.create({
  notice: {
    alignItems: "start",
    paddingBlock: space._8,
  },
  icon: {
    display: "inline-flex",
    fontSize: controlSize._6,
  },
  muted: {
    color: color.fgMuted,
  },
  danger: {
    color: color.fgDanger,
  },
});
