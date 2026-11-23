import { ChartLineIcon } from "@phosphor-icons/react/dist/ssr/ChartLine";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { CoinsIcon } from "@phosphor-icons/react/dist/ssr/Coins";
import { HourglassIcon } from "@phosphor-icons/react/dist/ssr/Hourglass";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Columns } from "@tuja/ui/components/columns";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { PageHeader } from "@tuja/ui/components/page-header";
import { Section } from "@tuja/ui/components/section";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import type { Metadata } from "next";
import { requirePageSession } from "#src/auth/require-page-session.ts";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { GUARDRAILS } from "#src/fund/guardrails.ts";
import { formatMoney } from "#src/fund/ui/format-money.ts";
import { formatPercent } from "#src/fund/ui/format-percent.ts";
import { FundHeadline } from "#src/fund/ui/fund-headline.tsx";
import { NavChart } from "#src/fund/ui/nav-chart.tsx";
import { OrderRows } from "#src/fund/ui/order-rows.tsx";
import { PositionsView } from "#src/fund/ui/positions-view.tsx";
import { SignedMoney } from "#src/fund/ui/signed-money.tsx";
import { loadFundState } from "#src/fund/views/load-fund-state.ts";
import { loadPortfolio } from "#src/fund/views/load-portfolio.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Portfolio", zh: "持仓" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  await requirePageSession(locale, "/portfolio");
  const db = getFundDb();
  const state = await loadFundState(db, { history: "nav" });
  const view = await loadPortfolio(db, state);
  const started = state.startedOn !== null;
  const { portfolio } = state;

  return (
    <NavigationStack
      label={t({ en: "Portfolio", zh: "持仓" })}
      css={pageColumn.report}
    >
      <PageHeader
        size="sm"
        title={t({ en: "Portfolio", zh: "持仓" })}
        description={t({
          en: "What the fund owns, what it is worth at the last close, and how it compares with the benchmark.",
          zh: "基金持有什么、按最近收盘价值多少，以及与基准相比表现如何。",
        })}
      />
      <FundHeadline state={state} locale={locale} />
      <Section
        level={2}
        look="heading"
        title={t({ en: "Fund against benchmark", zh: "基金与基准对比" })}
      >
        <Card>
          {state.history.length >= 2 ? (
            <NavChart points={state.history} />
          ) : (
            <EmptyState
              icon={<ChartLineIcon weight="bold" />}
              title={t({ en: "No history yet", zh: "还没有走势" })}
              description={
                started
                  ? t({
                      en: "The line starts after the fund's second close.",
                      zh: "基金有两个收盘价之后，走势线就会出现。",
                    })
                  : t({
                      en: "Once the strategy session puts the {amount} in, the fund is valued at every close and drawn against the benchmark.",
                      zh: "策略会议存入 {amount} 之后，基金按每个收盘价估值，并与基准对比画出走势。",
                    }).replace(
                      "{amount}",
                      formatMoney(GUARDRAILS.startingCashGbp, { whole: true }),
                    )
              }
            />
          )}
        </Card>
      </Section>
      <Section
        level={2}
        look="heading"
        title={t({ en: "Positions", zh: "持仓" })}
        description={
          view.positions.length > 0
            ? t({
                en: "Each lot must be held {n} days before it can be sold.",
                zh: "每批股票须持有 {n} 天后才能卖出。",
              }).replace("{n}", String(GUARDRAILS.minHoldDays))
            : undefined
        }
      >
        {view.positions.length > 0 ? (
          <PositionsView positions={view.positions} />
        ) : (
          <EmptyState
            icon={<CoinsIcon weight="bold" />}
            title={t({ en: "All in cash", zh: "全部为现金" })}
            description={t({
              en: "The fund holds no stock yet. It buys in steps, as the plan in its thesis says, so cash is where it starts.",
              zh: "基金还没有持有股票。它会按投资逻辑中的计划分步建仓，所以从现金开始。",
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
        )}
      </Section>
      <Columns>
        <Section
          level={2}
          look="heading"
          title={t({ en: "Cash and income", zh: "现金与收益" })}
        >
          <List>
            <ListRow
              value={formatMoney(
                started ? portfolio.cashGbp : state.depositsGbp,
              )}
              detail={t({
                en: "{pct} of the fund",
                zh: "占基金 {pct}",
              }).replace(
                "{pct}",
                formatPercent(started ? portfolio.cashWeightPct : 100, {
                  digits: 1,
                }),
              )}
            >
              {t({ en: "Cash", zh: "现金" })}
            </ListRow>
            <ListRow
              value={
                <SignedMoney amountGbp={portfolio.realisedPnlGbp} look="body" />
              }
              detail={t({
                en: "From shares sold, after fees",
                zh: "来自已卖出的股票，扣除费用后",
              })}
            >
              {t({ en: "Realised profit", zh: "已实现盈亏" })}
            </ListRow>
            <ListRow
              value={formatMoney(portfolio.dividendsGbp)}
              detail={t({
                en: "Paid on shares held at the ex-date",
                zh: "按除息日持有的股份派发",
              })}
            >
              {t({ en: "Dividends", zh: "股息" })}
            </ListRow>
          </List>
        </Section>
        <Section
          level={2}
          look="heading"
          title={t({ en: "Open orders", zh: "挂单" })}
        >
          {view.openOrders.length > 0 ? (
            <OrderRows kind="open" orders={view.openOrders} />
          ) : (
            <EmptyState
              icon={<HourglassIcon weight="bold" />}
              title={t({ en: "No open orders", zh: "没有挂单" })}
              description={t({
                en: "Orders from a meeting stay open until you say they filled or their last day passes.",
                zh: "会议定下的订单会一直挂着，直到你确认成交或到期。",
              })}
            />
          )}
        </Section>
      </Columns>
      <Section
        level={2}
        look="heading"
        title={t({ en: "Fills", zh: "成交记录" })}
      >
        {view.fills.length > 0 ? (
          <OrderRows kind="fills" fills={view.fills} />
        ) : (
          <EmptyState
            icon={<ClockCounterClockwiseIcon weight="bold" />}
            title={t({ en: "No fills yet", zh: "还没有成交" })}
            description={t({
              en: "Each fill you record on the Desk is listed, newest first.",
              zh: "你在交易台记录的每笔成交都会列出，最新的在前。",
            })}
          />
        )}
      </Section>
    </NavigationStack>
  );
}
