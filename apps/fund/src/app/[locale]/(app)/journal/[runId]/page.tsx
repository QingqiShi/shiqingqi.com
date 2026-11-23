import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Callout } from "@tuja/ui/components/callout";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { PageHeader } from "@tuja/ui/components/page-header";
import { Stat, StatGroup } from "@tuja/ui/components/stat";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageSession } from "#src/auth/require-page-session.ts";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { displayDate } from "#src/fund/ui/display-date.ts";
import { formatUsd } from "#src/fund/ui/format-usd.ts";
import { MinutesStep } from "#src/fund/ui/minutes-step.tsx";
import { modelName } from "#src/fund/ui/model-name.ts";
import { loadMinutes } from "#src/fund/views/load-minutes.ts";

interface MinutesRouteProps {
  params: Promise<{ locale: string; runId: string }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: MinutesRouteProps): Promise<Metadata> {
  validateLocale((await params).locale);
  return { title: t({ en: "Minutes", zh: "会议纪要" }) };
}

export default async function Page({ params }: MinutesRouteProps) {
  const { locale: rawLocale, runId } = await params;
  const locale = validateLocale(rawLocale);
  await requirePageSession(locale, `/journal/${runId}`);
  if (!UUID.test(runId)) notFound();
  const minutes = await loadMinutes(getFundDb(), runId);
  if (minutes === null) notFound();
  const { run, steps } = minutes;
  const done = steps.filter(
    (step) => step.status === "done" || step.status === "skipped",
  ).length;
  const tokens = (minutes.inputTokens + minutes.outputTokens).toLocaleString(
    "en-GB",
  );

  return (
    <NavigationStack
      label={t({ en: "Minutes", zh: "会议纪要" })}
      back={{
        href: getLocalePath("/journal", locale),
        label: t({ en: "Journal", zh: "日志" }),
      }}
      css={pageColumn.list}
    >
      <PageHeader
        size="sm"
        eyebrow={displayDate(run.asOf, locale, "long")}
        title={
          run.kind === "strategy"
            ? t({ en: "Strategy session", zh: "策略会议" })
            : t({ en: "Morning meeting", zh: "晨会" })
        }
        description={t({
          en: "Every step of the meeting in order. Open one to read what was written, the sources and what it cost.",
          zh: "会议的每一步按顺序排列。展开可阅读写下的内容、来源和花费。",
        })}
      />
      <StatGroup>
        <Stat
          label={t({ en: "Cost", zh: "费用" })}
          value={formatUsd(minutes.costUsd)}
          detail={t({
            en: "An estimate from list prices",
            zh: "按标价估算",
          })}
        />
        <Stat
          label={t({ en: "Tokens", zh: "词元" })}
          value={tokens}
          detail={
            minutes.webSearches === 0
              ? t({ en: "No web searches", zh: "没有网络搜索" })
              : t({ en: "{n} web searches", zh: "{n} 次网络搜索" }).replace(
                  "{n}",
                  String(minutes.webSearches),
                )
          }
        />
        <Stat
          label={t({ en: "Steps done", zh: "已完成步骤" })}
          value={`${String(done)}/${String(steps.length)}`}
          detail={
            minutes.models.length === 0
              ? undefined
              : minutes.models.map(modelName).join(", ")
          }
        />
      </StatGroup>
      {run.status === "failed" ? (
        <Callout
          intent="destructive"
          title={t({ en: "The meeting stopped", zh: "会议中断了" })}
        >
          {t({
            en: "A step failed. Continue it from the Desk; the steps already done are kept.",
            zh: "有一个步骤失败了。可以在交易台继续，已完成的步骤会保留。",
          })}
        </Callout>
      ) : null}
      <div css={stack.tight}>
        {steps.map((step) => (
          <MinutesStep key={step.id} step={step} />
        ))}
      </div>
    </NavigationStack>
  );
}
