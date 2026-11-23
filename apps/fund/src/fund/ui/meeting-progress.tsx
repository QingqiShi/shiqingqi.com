"use client";

import { ChartLineIcon } from "@phosphor-icons/react/dist/ssr/ChartLine";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { CompassIcon } from "@phosphor-icons/react/dist/ssr/Compass";
import { DatabaseIcon } from "@phosphor-icons/react/dist/ssr/Database";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { UserIcon } from "@phosphor-icons/react/dist/ssr/User";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Progress } from "@tuja/ui/components/progress";
import { Spinner } from "@tuja/ui/components/spinner";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import type { ReactNode } from "react";
import { stepPlan } from "../meeting/step-plan.ts";
import type { StepBrief } from "../views/load-desk.ts";

type Seat = "desk" | "strategist" | "analysts" | "pm" | "risk" | "checks";

const DAILY_SEATS: readonly Seat[] = [
  "desk",
  "strategist",
  "analysts",
  "pm",
  "risk",
  "checks",
];

function seatOf(step: StepBrief): Seat {
  switch (step.role) {
    case "strategist":
      return "strategist";
    case "analyst":
      return "analysts";
    case "pm":
      return "pm";
    case "risk":
      return "risk";
    case "system":
      return step.key === "data" || step.key === "screen" ? "desk" : "checks";
  }
}

type SeatState = "waiting" | "working" | "done" | "failed";

function stateOf(steps: readonly StepBrief[]): SeatState {
  if (steps.some((step) => step.status === "failed")) return "failed";
  if (steps.some((step) => step.status === "running")) return "working";
  if (
    steps.length > 0 &&
    steps.every((step) => step.status === "done" || step.status === "skipped")
  ) {
    return "done";
  }
  return "waiting";
}

const ICONS: Record<Seat, ReactNode> = {
  desk: <DatabaseIcon weight="bold" />,
  strategist: <CompassIcon weight="bold" />,
  analysts: <MagnifyingGlassIcon weight="bold" />,
  pm: <UserIcon weight="bold" />,
  risk: <ShieldCheckIcon weight="bold" />,
  checks: <ChartLineIcon weight="bold" />,
};

function SeatRow({
  seat,
  steps,
  meetingDone,
}: {
  seat: Seat;
  steps: readonly StepBrief[];
  meetingDone: boolean;
}) {
  const names: Record<Seat, string> = {
    desk: t({ en: "Market data and screen", zh: "行情数据与筛选" }),
    strategist: t({ en: "Strategist", zh: "策略师" }),
    analysts: t({ en: "Analysts", zh: "分析师" }),
    pm: t({ en: "Portfolio manager", zh: "基金经理" }),
    risk: t({ en: "Risk officer", zh: "风控官" }),
    checks: t({ en: "Rule checks and orders", zh: "规则检查与下单" }),
  };
  const jobs: Record<Seat, string> = {
    desk: t({
      en: "Loads the last closes and ranks the universe",
      zh: "读取最新收盘价，为股票池打分排序",
    }),
    strategist: t({
      en: "Reads the news and sets the scene",
      zh: "阅读新闻，判断市场环境",
    }),
    analysts: t({
      en: "One note on each stock held or shortlisted",
      zh: "为每只持仓和候选股票各写一份笔记",
    }),
    pm: t({
      en: "Drafts the decisions, then answers the risk officer",
      zh: "起草决策，再回应风控官",
    }),
    risk: t({
      en: "Reviews the draft and signs off the orders",
      zh: "审阅草案并签批订单",
    }),
    checks: t({
      en: "Checks every order against the fund's rules",
      zh: "按基金规则检查每一笔订单",
    }),
  };
  const state: SeatState =
    meetingDone && stateOf(steps) === "waiting" ? "done" : stateOf(steps);
  const stateText: Record<SeatState, string> = {
    waiting: t({ en: "Waiting", zh: "等待中" }),
    working: t({ en: "At work", zh: "工作中" }),
    done: t({ en: "Done", zh: "完成" }),
    failed: t({ en: "Stopped", zh: "中断" }),
  };
  const analysts = steps.filter((step) => step.role === "analyst");
  return (
    <ListRow
      wrap
      leading={ICONS[seat]}
      leadingShape="circle"
      leadingSize="sm"
      detail={jobs[seat]}
      extra={
        seat === "analysts" && analysts.length > 0 ? (
          <span css={cluster.inline}>
            {analysts.map((step) => (
              <AnalystChip key={step.key} step={step} />
            ))}
          </span>
        ) : null
      }
      trailing={
        state === "working" ? (
          <Badge intent="info" icon={<Spinner size="inline" aria-hidden />}>
            {stateText.working}
          </Badge>
        ) : state === "done" ? (
          <Badge intent="success" icon={<CheckCircleIcon weight="bold" />}>
            {stateText.done}
          </Badge>
        ) : state === "failed" ? (
          <Badge intent="destructive">{stateText.failed}</Badge>
        ) : (
          <Badge intent="neutral">{stateText.waiting}</Badge>
        )
      }
    >
      {names[seat]}
    </ListRow>
  );
}

function AnalystChip({ step }: { step: StepBrief }) {
  const symbol = stepPlan.symbolOf(step.key);
  const label = step.key.startsWith("followup:")
    ? t({ en: "{symbol} follow-up", zh: "{symbol} 追问" }).replace(
        "{symbol}",
        symbol,
      )
    : symbol;
  const intent =
    step.status === "done"
      ? "success"
      : step.status === "running"
        ? "info"
        : step.status === "failed"
          ? "destructive"
          : "neutral";
  return (
    <Badge size="sm" intent={intent}>
      {label}
    </Badge>
  );
}

/**
 * Who sits at the meeting and how far each has got: one fixed row per seat,
 * so the list keeps its shape while the steps come in.
 */
export function MeetingProgress({
  kind,
  steps,
  meetingDone = false,
}: {
  kind: "strategy" | "daily";
  steps: readonly StepBrief[];
  meetingDone?: boolean;
}) {
  const seats =
    kind === "daily"
      ? DAILY_SEATS
      : DAILY_SEATS.filter(
          (seat) =>
            seat === "pm" ||
            seat === "risk" ||
            steps.some((step) => seatOf(step) === seat),
        );
  const done = steps.filter(
    (step) => step.status === "done" || step.status === "skipped",
  ).length;
  return (
    <div css={stack.item}>
      <Progress
        value={meetingDone ? 1 : done}
        max={meetingDone ? 1 : Math.max(steps.length, 1)}
        label={t({ en: "Meeting progress", zh: "会议进度" })}
        size="sm"
      />
      <List form="plain">
        {seats.map((seat) => (
          <SeatRow
            key={seat}
            seat={seat}
            steps={steps.filter((step) => seatOf(step) === seat)}
            meetingDone={meetingDone}
          />
        ))}
      </List>
    </div>
  );
}
