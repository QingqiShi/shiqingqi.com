"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Card } from "@tuja/ui/components/card";
import { Divider } from "@tuja/ui/components/divider";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { useFlowChange } from "@tuja/ui/hooks/use-flow-change";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useBaseCurrency } from "../accounts/use-base-currency.ts";
import { useHouseholdToday } from "../accounts/use-household-today.ts";
import { selectAnalyticsIndex } from "../analytics/select-analytics-index.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { financeHref } from "../navigation/finance-href.ts";
import { useReplica } from "../replica/use-replica.ts";
import { FinanceAddButton } from "../shell/finance-add-button.tsx";
import { NewTransactionSheet } from "../shell/new-transaction-sheet.tsx";
import {
  barWindowEnd,
  buildMonthBars,
  buildMonthView,
} from "./build-month-view.ts";
import { monthBounds, type MonthKey } from "./month-bounds.ts";
import { MonthCalendar } from "./month-calendar.tsx";
import { MonthDayDetail } from "./month-day-detail.tsx";
import { MonthStrip } from "./month-strip.tsx";
import { MonthSummary } from "./month-summary.tsx";
import { SpendingRing } from "./spending-ring.tsx";
import { TopPayees } from "./top-payees.tsx";
import { useMonthState } from "./use-month-state.ts";

const BARS = 12;

function MonthContent() {
  const index = useReplica(selectAnalyticsIndex);
  const today = useHouseholdToday();
  const currency = useBaseCurrency();
  const bounds = monthBounds(index.firstDay, today);
  const { month, setMonth, pickedDay, setPickedDay } = useMonthState(bounds);
  const flow = useFlowChange();
  const view = buildMonthView(index, month);
  const bars = buildMonthBars(
    index,
    barWindowEnd(month, bounds.last, BARS),
    BARS,
  );
  const todayEpoch = toEpochDay(today);
  const shownDay = pickedDay ?? todayEpoch;
  const day = view.days[shownDay - view.firstDay] ?? null;

  const goTo = (next: MonthKey) => {
    flow(() => {
      setMonth(next);
    });
  };

  if (index.length === 0) {
    return (
      <Text as="p" look="body" tone="muted">
        {t({
          en: "No spending or income yet. Add a transaction to see your month.",
          zh: "还没有收支记录。添加一笔交易，看看这个月的情况。",
        })}
      </Text>
    );
  }

  return (
    <div css={stack.group}>
      <div css={styles.top}>
        <MonthSummary
          view={view}
          bounds={bounds}
          currency={currency}
          onMonth={goTo}
        />
        <Card padding="sm">
          <MonthStrip
            bars={bars}
            month={month}
            bounds={bounds}
            currency={currency}
            onMonth={goTo}
          />
        </Card>
      </div>
      <Card padding="sm">
        <MonthCalendar
          view={view}
          index={index}
          currency={currency}
          today={todayEpoch}
          pickedDay={shownDay}
          onPickDay={(epochDay) => {
            flow(() => {
              setPickedDay(epochDay);
            });
          }}
        />
        <FlowBlock css={stack.item}>
          <Divider />
          <MonthDayDetail day={day} index={index} currency={currency} />
        </FlowBlock>
      </Card>
      <div css={styles.columns}>
        <Card>
          <SpendingRing view={view} currency={currency} />
        </Card>
        <Card>
          <TopPayees view={view} currency={currency} />
        </Card>
      </div>
    </div>
  );
}

function MonthSkeleton() {
  return (
    <div css={stack.group} aria-busy>
      <Skeleton width="12rem" height="2.5rem" />
      <Skeleton width="100%" height="8rem" shape="control" />
      <Skeleton width="100%" height="28rem" shape="control" />
    </div>
  );
}

/**
 * `/analytics/month`: one month at a glance, worked out on the device from
 * the Replica: money in and out, a calendar of its days, where the money
 * went, and the months around it.
 */
export function MonthScreen() {
  const locale = useLocale();
  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);
  return (
    <>
      <NavigationSplitView
        content={{
          label: t({ en: "Month", zh: "月度" }),
          accessory: <FinanceAddButton />,
          back: {
            href: financeHref({ screen: "analytics" }, locale),
            label: t({ en: "Analytics", zh: "分析" }),
          },
          node: bootstrapped ? <MonthContent /> : <MonthSkeleton />,
        }}
      />
      <NewTransactionSheet />
    </>
  );
}

const styles = stylex.create({
  top: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: "minmax(0, 1fr) minmax(0, 1fr)",
    },
    alignItems: "center",
    gap: rhythm.group,
  },
  columns: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: "repeat(2, minmax(0, 1fr))",
    },
    gap: rhythm.group,
    alignItems: "start",
  },
});
