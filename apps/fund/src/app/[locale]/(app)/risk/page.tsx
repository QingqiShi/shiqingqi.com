import { ShieldWarningIcon } from "@phosphor-icons/react/dist/ssr/ShieldWarning";
import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Card } from "@tuja/ui/components/card";
import { Columns } from "@tuja/ui/components/columns";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { PageHeader } from "@tuja/ui/components/page-header";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { requirePageSession } from "#src/auth/require-page-session.ts";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { displayDate } from "#src/fund/ui/display-date.ts";
import { ExposureBreakdowns } from "#src/fund/ui/exposure-breakdowns.tsx";
import { GuardrailList } from "#src/fund/ui/guardrail-list.tsx";
import { MarkdownText } from "#src/fund/ui/markdown-text.tsx";
import { PolicyLimitList } from "#src/fund/ui/policy-limit-list.tsx";
import { RiskFactorCard } from "#src/fund/ui/risk-factor-card.tsx";
import { loadRisk } from "#src/fund/views/load-risk.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Risk", zh: "风险" }) };
}

const STANCE_ORDER = { seek: 0, accept: 1, limit: 2, avoid: 3 } as const;

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  await requirePageSession(locale, "/risk");
  const view = await loadRisk(getFundDb());
  const factors = view.check?.factors ?? [];
  const sorted = [...factors].sort(
    (a, b) => STANCE_ORDER[a.factor.stance] - STANCE_ORDER[b.factor.stance],
  );

  return (
    <NavigationStack
      label={t({ en: "Risk", zh: "风险" })}
      css={pageColumn.report}
    >
      <PageHeader
        size="sm"
        title={t({ en: "Risk", zh: "风险" })}
        description={t({
          en: "The fund takes some risks on purpose, because it is paid for them, and keeps away from others. The risk officer sets which is which.",
          zh: "基金有意承担一些风险，因为承担它们有回报；也刻意回避另一些。由风控官决定哪些是哪些。",
        })}
      />
      {view.policy === null ? (
        <EmptyState
          icon={<ShieldWarningIcon weight="bold" />}
          title={t({ en: "No risk policy yet", zh: "还没有风险政策" })}
          description={t({
            en: "At the strategy session the risk officer writes the risk budget: each risk with a stance, a target range and the reason. Until then, only the owner's guardrails below apply.",
            zh: "策略会议上，风控官会写下风险预算：每项风险的立场、目标范围和理由。在此之前，只有下面的硬性规则生效。",
          })}
        />
      ) : (
        <>
          <Card>
            <div css={stack.item}>
              <MarkdownText>{view.policy.body.statement}</MarkdownText>
              <Text as="p" look="caption" tone="muted">
                {t({
                  en: "Risk policy, version {n}, {date}",
                  zh: "风险政策第 {n} 版，{date}",
                })
                  .replace("{n}", String(view.policy.version))
                  .replace(
                    "{date}",
                    displayDate(view.policy.decidedOn, locale, "dayYear"),
                  )}
                {view.policy.changeNote === null
                  ? null
                  : `${t({ en: ": ", zh: "：" })}${view.policy.changeNote}`}
              </Text>
            </div>
          </Card>
          <Section
            level={2}
            look="heading"
            title={t({ en: "Risk budget", zh: "风险预算" })}
            description={
              !view.started
                ? t({
                    en: "Each risk with the fund's stance on it. The numbers are measured once the fund has money.",
                    zh: "每项风险及基金对它的立场。基金有资金后才会测量数值。",
                  })
                : t({
                    en: "Each risk with the fund's stance on it, and where the portfolio sits today.",
                    zh: "每项风险及基金对它的立场，以及组合今天所处的位置。",
                  })
            }
          >
            <Columns>
              <div css={stack.group}>
                {sorted
                  .filter((_, index) => index % 2 === 0)
                  .map((check) => (
                    <RiskFactorCard key={check.factor.key} check={check} />
                  ))}
              </div>
              <div css={stack.group}>
                {sorted
                  .filter((_, index) => index % 2 === 1)
                  .map((check) => (
                    <RiskFactorCard key={check.factor.key} check={check} />
                  ))}
              </div>
            </Columns>
          </Section>
        </>
      )}
      <Section
        level={2}
        look="heading"
        title={t({ en: "Hard limits", zh: "硬性限制" })}
      >
        <Columns>
          <Section
            level={3}
            title={t({ en: "The owner's guardrails", zh: "所有者的护栏" })}
            description={t({
              en: "Code checks every order against these. No agent can loosen them.",
              zh: "程序按这些规则检查每一笔订单，任何智能体都不能放宽。",
            })}
          >
            <GuardrailList checks={view.guardrails} />
          </Section>
          <Section
            level={3}
            title={t({ en: "The policy's limits", zh: "风险政策的限制" })}
            description={t({
              en: "Set by the risk officer, inside the guardrails.",
              zh: "由风控官在护栏之内设定。",
            })}
          >
            {view.check === null ? (
              <EmptyState
                level={4}
                title={t({ en: "None set yet", zh: "尚未设定" })}
                description={t({
                  en: "They come with the risk policy.",
                  zh: "它们随风险政策一起制定。",
                })}
              />
            ) : (
              <PolicyLimitList limits={view.check.limits} />
            )}
          </Section>
        </Columns>
      </Section>
      <Section
        level={2}
        look="heading"
        title={t({ en: "Where the risk sits", zh: "风险分布" })}
      >
        <ExposureBreakdowns exposure={view.exposure} names={view.names} />
      </Section>
    </NavigationStack>
  );
}
