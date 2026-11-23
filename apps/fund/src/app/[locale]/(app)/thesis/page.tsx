import { LightbulbIcon } from "@phosphor-icons/react/dist/ssr/Lightbulb";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Button } from "@tuja/ui/components/button";
import { Columns } from "@tuja/ui/components/columns";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { PageHeader } from "@tuja/ui/components/page-header";
import { Section } from "@tuja/ui/components/section";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { requirePageSession } from "#src/auth/require-page-session.ts";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { getInstruments } from "#src/fund/market/get-instruments.ts";
import { FundThesisView } from "#src/fund/ui/fund-thesis-view.tsx";
import { PositionThesisCard } from "#src/fund/ui/position-thesis-card.tsx";
import { ScreenRulesView } from "#src/fund/ui/screen-rules-view.tsx";
import { loadThesis } from "#src/fund/views/load-thesis.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Thesis", zh: "投资逻辑" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  await requirePageSession(locale, "/thesis");
  const db = getFundDb();
  const view = await loadThesis(db, await getInstruments(db));
  const open = view.positions.filter((thesis) => thesis.status === "active");
  const closed = view.positions.filter((thesis) => thesis.status !== "active");

  return (
    <NavigationStack
      label={t({ en: "Thesis", zh: "投资逻辑" })}
      css={pageColumn.report}
    >
      <PageHeader
        size="sm"
        title={t({ en: "Thesis", zh: "投资逻辑" })}
        description={t({
          en: "Why the fund invests the way it does, why it owns each stock, and the rules that pick the stocks it looks at.",
          zh: "基金为什么这样投资、为什么持有每只股票，以及挑选候选股票的规则。",
        })}
      />
      <Section
        level={2}
        look="heading"
        title={t({ en: "The fund", zh: "基金" })}
      >
        {view.fund === null ? (
          <EmptyState
            icon={<LightbulbIcon weight="bold" />}
            title={t({ en: "No thesis yet", zh: "还没有投资逻辑" })}
            description={t({
              en: "The strategy session writes it: the philosophy, the edge the fund claims, how it builds the portfolio and the plan from all cash.",
              zh: "由策略会议写下：投资理念、基金自认的优势、组合如何构建，以及从全现金起步的计划。",
            })}
            action={
              <Button
                href={getLocalePath("/", locale)}
                look="outline"
                size="sm"
              >
                {t({ en: "Go to the Desk", zh: "前往交易台" })}
              </Button>
            }
          />
        ) : (
          <FundThesisView fund={view.fund} versions={view.fundVersions} />
        )}
      </Section>
      <Section
        level={2}
        look="heading"
        title={t({ en: "Each position", zh: "每个持仓" })}
        description={
          open.length > 0
            ? t({
                en: "Every analyst checks these at each meeting.",
                zh: "每次会议，分析师都会逐条核对。",
              })
            : undefined
        }
      >
        {open.length === 0 ? (
          <EmptyState
            title={t({ en: "No open positions", zh: "没有持仓" })}
            description={t({
              en: "Each first buy comes with a thesis: why the stock, what drives it, and the facts that would prove it wrong.",
              zh: "每次首次买入都附带一份投资逻辑：为什么选这只股票、驱动因素是什么，以及哪些事实会证明它错了。",
            })}
          />
        ) : (
          <Columns>
            <div css={stack.group}>
              {open
                .filter((_, index) => index % 2 === 0)
                .map((thesis) => (
                  <PositionThesisCard key={thesis.id} thesis={thesis} />
                ))}
            </div>
            <div css={stack.group}>
              {open
                .filter((_, index) => index % 2 === 1)
                .map((thesis) => (
                  <PositionThesisCard key={thesis.id} thesis={thesis} />
                ))}
            </div>
          </Columns>
        )}
        {closed.length === 0 ? null : (
          <Disclosure
            look="card"
            summary={t({
              en: "Closed positions ({n})",
              zh: "已结束的持仓（{n}）",
            }).replace("{n}", String(closed.length))}
          >
            <div css={stack.group}>
              {closed.map((thesis) => (
                <PositionThesisCard key={thesis.id} thesis={thesis} />
              ))}
            </div>
          </Disclosure>
        )}
      </Section>
      <Section
        level={2}
        look="heading"
        title={t({ en: "The screen", zh: "选股筛选" })}
        description={t({
          en: "Code ranks every stock of the universe before each meeting; the analysts read the shortlist.",
          zh: "每次会议前，程序先给股票池里的每只股票打分排序；分析师阅读候选名单。",
        })}
      >
        <ScreenRulesView
          weights={view.fund?.body.screenWeights ?? null}
          screen={view.screen}
        />
      </Section>
    </NavigationStack>
  );
}
