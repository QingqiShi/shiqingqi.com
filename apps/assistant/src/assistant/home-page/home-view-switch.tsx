"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { StatusDot } from "@tuja/ui/components/status-dot";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { startTransition, useOptimistic } from "react";
import { homeViewHref } from "../home/choose-home-view.ts";
import type { HomeView } from "../home/types.ts";
import { useUnseenReport } from "./home-status-provider.tsx";

/**
 * The switch between the views of the home page, each at its own address.
 * When a report comes while the plan shows, the plan stays, and a dot on
 * Report says that a report waits.
 */
export function HomeViewSwitch({ view }: { view: HomeView }) {
  const locale = useLocale();
  const router = useRouter();
  const [shown, setShown] = useOptimistic(view);
  const reportWaits = useUnseenReport() && view === "today";
  const report = t({ en: "Report", zh: "晨报" });
  return (
    <SegmentedControl
      aria-label={t({ en: "What to show", zh: "显示什么" })}
      value={shown}
      options={[
        {
          value: "report",
          label: reportWaits ? (
            <span css={[row.inline, styles.withDot]}>
              {report}
              <StatusDot intent="warning" />
            </span>
          ) : (
            report
          ),
          "aria-label": reportWaits
            ? t({ en: "Report, new", zh: "晨报，新的" })
            : undefined,
        },
        { value: "today", label: t({ en: "Plan", zh: "计划" }) },
      ]}
      onChange={(next) => {
        if (next === shown) return;
        startTransition(() => {
          setShown(next);
          router.push(homeViewHref(next, locale));
        });
      }}
    />
  );
}

const styles = stylex.create({
  withDot: {
    display: "inline-flex",
  },
});
