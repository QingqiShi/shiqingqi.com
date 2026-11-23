"use client";

import { CompassIcon } from "@phosphor-icons/react/dist/ssr/Compass";
import { DatabaseIcon } from "@phosphor-icons/react/dist/ssr/Database";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { UserIcon } from "@phosphor-icons/react/dist/ssr/User";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Anchor } from "@tuja/ui/components/anchor";
import { Badge } from "@tuja/ui/components/badge";
import { Callout } from "@tuja/ui/components/callout";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { ReactNode } from "react";
import { stepPlan } from "../meeting/step-plan.ts";
import type { MinutesStep as MinutesStepData } from "../views/load-minutes.ts";
import { formatUsd } from "./format-usd.ts";
import { MarkdownText } from "./markdown-text.tsx";
import { modelName } from "./model-name.ts";

const styles = stylex.create({
  error: {
    maxBlockSize: "12rem",
    overflowY: "auto",
    overflowWrap: "anywhere",
  },
  sources: {
    margin: 0,
    paddingInlineStart: "1.25rem",
  },
});

const ICONS: Record<MinutesStepData["role"], ReactNode> = {
  system: <DatabaseIcon weight="bold" />,
  strategist: <CompassIcon weight="bold" />,
  analyst: <MagnifyingGlassIcon weight="bold" />,
  pm: <UserIcon weight="bold" />,
  risk: <ShieldCheckIcon weight="bold" />,
};

function useStepTitle(key: string): string {
  const symbol = stepPlan.symbolOf(key);
  const titles: Record<string, string> = {
    data: t({ en: "Market data", zh: "行情数据" }),
    screen: t({ en: "Screen", zh: "股票筛选" }),
    macro: t({ en: "Strategist's brief", zh: "策略师简报" }),
    pm_draft: t({ en: "Portfolio manager's draft", zh: "基金经理的草案" }),
    checks_draft: t({ en: "Rule checks on the draft", zh: "草案的规则检查" }),
    risk_review: t({ en: "Risk officer's review", zh: "风控官的审查" }),
    pm_final: t({ en: "Portfolio manager's decisions", zh: "基金经理的决定" }),
    checks_final: t({
      en: "Rule checks on the decisions",
      zh: "决定的规则检查",
    }),
    risk_signoff: t({ en: "Risk officer's sign-off", zh: "风控官签字" }),
    commit: t({ en: "Recorded", zh: "记录结果" }),
  };
  const analyst = t({
    en: "Analyst note: {symbol}",
    zh: "分析师笔记：{symbol}",
  });
  const followup = t({
    en: "Follow-up on {symbol}",
    zh: "{symbol} 追问",
  });
  if (key.startsWith("analyst:")) return analyst.replace("{symbol}", symbol);
  if (key.startsWith("followup:")) return followup.replace("{symbol}", symbol);
  return titles[key] ?? key;
}

function useRoleName(role: MinutesStepData["role"]): string {
  const names: Record<MinutesStepData["role"], string> = {
    system: t({ en: "Code", zh: "程序" }),
    strategist: t({ en: "Strategist", zh: "策略师" }),
    analyst: t({ en: "Analyst", zh: "分析师" }),
    pm: t({ en: "Portfolio manager", zh: "基金经理" }),
    risk: t({ en: "Risk officer", zh: "风控官" }),
  };
  return names[role];
}

function StatusBadge({ status }: { status: MinutesStepData["status"] }) {
  switch (status) {
    case "done":
      return null;
    case "running":
      return <Badge intent="info">{t({ en: "Working", zh: "进行中" })}</Badge>;
    case "pending":
      return (
        <Badge intent="neutral">{t({ en: "Not reached", zh: "未进行" })}</Badge>
      );
    case "skipped":
      return (
        <Badge intent="neutral">{t({ en: "Skipped", zh: "已跳过" })}</Badge>
      );
    case "failed":
      return (
        <Badge intent="destructive">{t({ en: "Failed", zh: "失败" })}</Badge>
      );
  }
}

function UsageLine({ step }: { step: MinutesStepData }) {
  if (step.model === null && step.usage === null) return null;
  const parts = [
    step.model === null ? null : modelName(step.model),
    step.usage === null
      ? null
      : t({
          en: "{in} tokens in, {out} out",
          zh: "输入 {in} 个词元，输出 {out} 个",
        })
          .replace("{in}", step.usage.inputTokens.toLocaleString("en-GB"))
          .replace("{out}", step.usage.outputTokens.toLocaleString("en-GB")),
    step.usage === null || step.usage.webSearches === 0
      ? null
      : t({ en: "{n} web searches", zh: "{n} 次网络搜索" }).replace(
          "{n}",
          String(step.usage.webSearches),
        ),
    step.usage?.webSearchErrors === undefined ||
    step.usage.webSearchErrors.length === 0
      ? null
      : t({
          en: "{n} searches failed ({codes})",
          zh: "{n} 次搜索失败（{codes}）",
        })
          .replace("{n}", String(step.usage.webSearchErrors.length))
          .replace(
            "{codes}",
            [...new Set(step.usage.webSearchErrors)].join(", "),
          ),
    step.usage === null ? null : formatUsd(step.usage.costUsd),
  ].filter((part) => part !== null);
  return (
    <Text as="p" look="caption" tone="muted">
      {parts.join(" · ")}
    </Text>
  );
}

function SourceList({ sources }: { sources: MinutesStepData["sources"] }) {
  const newTab = t({ en: "(opens in new tab)", zh: "（在新标签页中打开）" });
  return (
    <Section level={4} title={t({ en: "Sources", zh: "来源" })}>
      <ul css={[stack.tight, styles.sources]}>
        {sources.map((source) => (
          <li key={source.url}>
            <Text as="span" look="bodySmall">
              <Anchor
                href={source.url}
                target="_blank"
                tone="muted"
                newTabLabel={newTab}
              >
                {source.title}
              </Anchor>
            </Text>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/**
 * One step of a meeting in its minutes: who did it, what they wrote, what
 * they read, and what it cost. A failed analyst step is a note the meeting
 * went on without.
 */
export function MinutesStep({ step }: { step: MinutesStepData }) {
  const title = useStepTitle(step.key);
  const role = useRoleName(step.role);
  const missingNote = step.status === "failed" && step.role === "analyst";
  return (
    <Disclosure
      look="card"
      icon={ICONS[step.role]}
      summary={
        <span css={stack.text}>
          <Text as="span" look="body" weight="semibold">
            {title}
          </Text>
          <Text as="span" look="caption" tone="muted">
            {role}
          </Text>
        </span>
      }
      trailing={
        missingNote ? (
          <Badge intent="warning">
            {t({ en: "Note missing", zh: "笔记缺失" })}
          </Badge>
        ) : (
          <StatusBadge status={step.status} />
        )
      }
    >
      <div css={stack.item}>
        {missingNote ? (
          <Callout
            intent="warning"
            title={t({ en: "Note missing", zh: "笔记缺失" })}
          >
            {t({
              en: "The analyst could not finish, so the meeting went on without this note.",
              zh: "分析师没能完成，会议在没有这份笔记的情况下继续。",
            })}
          </Callout>
        ) : null}
        {step.status === "failed" && step.error !== null ? (
          <Disclosure
            look="inline"
            summary={t({ en: "What went wrong", zh: "出错详情" })}
          >
            <Text as="p" look="caption" tone="muted" css={styles.error}>
              {step.error}
            </Text>
          </Disclosure>
        ) : null}
        {step.memo === null || step.memo === "" ? (
          step.status === "done" ? null : (
            <Text as="p" look="bodySmall" tone="muted">
              {step.status === "pending"
                ? t({
                    en: "The meeting did not reach this step.",
                    zh: "会议没有进行到这一步。",
                  })
                : step.status === "skipped"
                  ? t({
                      en: "Not needed at this meeting.",
                      zh: "这次会议不需要这一步。",
                    })
                  : step.status === "running"
                    ? t({ en: "At work now.", zh: "正在进行。" })
                    : null}
            </Text>
          )
        ) : (
          <MarkdownText>{step.memo}</MarkdownText>
        )}
        {step.sources.length === 0 ? null : (
          <SourceList sources={step.sources} />
        )}
        <UsageLine step={step} />
      </div>
    </Disclosure>
  );
}
