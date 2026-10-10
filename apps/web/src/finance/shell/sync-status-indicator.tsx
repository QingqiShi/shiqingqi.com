"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import {
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, controlSize, rhythm } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useSyncStatusSummary } from "./use-sync-status-summary.tsx";

/**
 * Where the Replica stands against the server: synced, syncing, offline
 * with changes waiting, or a problem, with a retry once a retry can help.
 */
export function SyncStatusIndicator() {
  const { status, tone, label, icon, spinning } = useSyncStatusSummary();
  const { runtime } = useFinanceRuntime();

  const downloadFailing =
    (status.problem === "server" || status.problem === "busy") &&
    status.failures >= RETRY_AFTER_FAILURES;
  const pushFailing =
    status.problem === null &&
    (status.pushProblem === "server" || status.pushProblem === "busy") &&
    status.pushFailures >= RETRY_AFTER_FAILURES;
  const canRetry =
    status.activity === "idle" && (downloadFailing || pushFailing);

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
        <span css={styles.label}>{label}</span>
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
