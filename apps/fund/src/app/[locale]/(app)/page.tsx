import { NotebookIcon } from "@phosphor-icons/react/dist/ssr/Notebook";
import { ReceiptIcon } from "@phosphor-icons/react/dist/ssr/Receipt";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { Columns } from "@tuja/ui/components/columns";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { PageHeader } from "@tuja/ui/components/page-header";
import { Section } from "@tuja/ui/components/section";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { show } from "@tuja/ui/primitives/show.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import type { Metadata } from "next";
import { requirePageSession } from "#src/auth/require-page-session.ts";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { DecisionNoteList } from "#src/fund/ui/decision-note-list.tsx";
import { displayDate } from "#src/fund/ui/display-date.ts";
import { FundHeadline } from "#src/fund/ui/fund-headline.tsx";
import { MarkdownText } from "#src/fund/ui/markdown-text.tsx";
import { MeetingPanel } from "#src/fund/ui/meeting-panel.tsx";
import { MorningSteps } from "#src/fund/ui/morning-steps.tsx";
import { OrderTicket } from "#src/fund/ui/order-ticket.tsx";
import { PendingOrderCard } from "#src/fund/ui/pending-order-card.tsx";
import { SignOutButton } from "#src/fund/ui/sign-out-button.tsx";
import { StillWorkingList } from "#src/fund/ui/still-working-list.tsx";
import { loadDesk } from "#src/fund/views/load-desk.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  validateLocale((await props.params).locale);
  return { title: t({ en: "Desk", zh: "交易台" }) };
}

export default async function Page({ params }: PageProps) {
  const locale = validateLocale((await params).locale);
  await requirePageSession(locale, "/");
  const desk = await loadDesk(getFundDb());
  const { state, decisions } = desk;
  const fromEarlierDay = decisions !== null && decisions.asOf !== state.today;
  const minutesHref =
    decisions === null
      ? null
      : getLocalePath(`/journal/${decisions.runId}`, locale);

  return (
    <NavigationStack
      label={t({ en: "Desk", zh: "交易台" })}
      css={pageColumn.report}
    >
      <PageHeader
        size="sm"
        eyebrow={displayDate(state.today, locale, "long")}
        title={t({ en: "Desk", zh: "交易台" })}
      />
      <FundHeadline state={state} locale={locale} showModels />
      <Columns ratio="2:1">
        <div css={stack.group}>
          {desk.pending.length > 0 ? (
            <Section
              level={2}
              look="heading"
              title={t({ en: "Did these fill?", zh: "这些订单成交了吗？" })}
              description={t({
                en: "Say what happened to each order before the next meeting: it cannot start until you do.",
                zh: "请先说明每笔订单的结果：在你回答之前，下一次会议无法开始。",
              })}
            >
              <div css={stack.item}>
                {desk.pending.map((order) => (
                  <PendingOrderCard key={order.id} order={order} />
                ))}
              </div>
            </Section>
          ) : null}
          <MeetingPanel
            hasThesis={desk.hasThesis}
            pendingCount={desk.pending.length}
            doneToday={desk.doneToday}
            activeRun={desk.activeRun}
          />
          <Section
            level={2}
            look="heading"
            title={t({ en: "Orders to place", zh: "待下的订单" })}
            description={
              decisions === null
                ? undefined
                : fromEarlierDay
                  ? t({
                      en: "From the meeting of {date}. Place each as a limit order with your broker.",
                      zh: "来自 {date} 的会议。请在券商处把每笔下成限价单。",
                    }).replace(
                      "{date}",
                      displayDate(decisions.asOf, locale, "weekday"),
                    )
                  : t({
                      en: "From this morning's meeting. Place each as a limit order with your broker.",
                      zh: "来自今早的会议。请在券商处把每笔下成限价单。",
                    })
            }
            actions={
              minutesHref === null ? null : (
                <Button
                  href={minutesHref}
                  look="ghost"
                  size="sm"
                  icon={<NotebookIcon weight="bold" />}
                >
                  {t({ en: "Minutes", zh: "会议纪要" })}
                </Button>
              )
            }
          >
            {decisions === null ? (
              <EmptyState
                icon={<ReceiptIcon weight="bold" />}
                title={t({ en: "No orders yet", zh: "还没有订单" })}
                description={
                  desk.hasThesis
                    ? t({
                        en: "After the morning meeting, the orders to place with your broker show in this list.",
                        zh: "晨会结束后，需要你在券商处下的订单会显示在这里。",
                      })
                    : t({
                        en: "Hold the first meeting. It writes the investment thesis and lists the orders to place, and from then on a meeting is held each trading morning.",
                        zh: "请召开第一次会议。它会写下投资逻辑并列出要下的订单，之后每个交易日早上都会开会。",
                      })
                }
              />
            ) : decisions.tickets.length === 0 ? (
              <EmptyState
                icon={<ReceiptIcon weight="bold" />}
                title={t({ en: "Nothing to place", zh: "没有要下的订单" })}
                description={t({
                  en: "The meeting decided to trade nothing. The reasons are beside this.",
                  zh: "会议决定不交易，理由见旁边。",
                })}
              />
            ) : (
              <div css={stack.item}>
                {decisions.tickets.map((ticket) => (
                  <OrderTicket key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </Section>
          {desk.stillWorking.length === 0 ? null : (
            <Section
              level={3}
              title={t({
                en: "Still working from earlier meetings",
                zh: "早前会议仍在挂着的订单",
              })}
              description={t({
                en: "Leave these in place at your broker until they fill or lapse.",
                zh: "请在券商处保留这些订单，直到成交或到期。",
              })}
            >
              <StillWorkingList orders={desk.stillWorking} />
            </Section>
          )}
        </div>
        <div css={stack.group}>
          {decisions === null ? (
            <MorningSteps />
          ) : (
            <>
              {decisions.noAction === null ? null : (
                <Card>
                  <div css={stack.item}>
                    <CardHeader>
                      <CardTitle level={3}>
                        {t({
                          en: "Why no trade",
                          zh: "为什么不交易",
                        })}
                      </CardTitle>
                    </CardHeader>
                    <MarkdownText>{decisions.noAction.rationale}</MarkdownText>
                  </div>
                </Card>
              )}
              {decisions.holds.length === 0 ? null : (
                <DecisionNoteList
                  title={t({ en: "Holding", zh: "继续持有" })}
                  description={t({
                    en: "Positions the meeting kept as they are.",
                    zh: "会议决定维持不变的持仓。",
                  })}
                  notes={decisions.holds}
                />
              )}
              {decisions.cancels.length === 0 ? null : (
                <DecisionNoteList
                  title={t({ en: "Orders to cancel", zh: "要撤销的订单" })}
                  description={t({
                    en: "Cancel these with your broker too.",
                    zh: "也请在券商处撤销这些订单。",
                  })}
                  notes={decisions.cancels}
                />
              )}
              {decisions.rejected.length === 0 ? null : (
                <DecisionNoteList
                  title={t({ en: "Stopped by the rules", zh: "被规则拦下" })}
                  description={t({
                    en: "Trades the portfolio manager wanted that a rule or the risk officer stopped.",
                    zh: "基金经理想做、但被规则或风控官拦下的交易。",
                  })}
                  notes={decisions.rejected}
                />
              )}
              {decisions.signoff === null ? null : (
                <Card>
                  <div css={stack.item}>
                    <CardHeader>
                      <CardTitle level={3}>
                        {t({ en: "Risk officer's sign-off", zh: "风控官签批" })}
                      </CardTitle>
                    </CardHeader>
                    <MarkdownText>{decisions.signoff}</MarkdownText>
                    {minutesHref === null ? null : (
                      <div>
                        <Button
                          href={minutesHref}
                          look="outline"
                          size="sm"
                          icon={<NotebookIcon weight="bold" />}
                        >
                          {t({
                            en: "Read the full minutes",
                            zh: "阅读完整纪要",
                          })}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </Columns>
      <div css={show.narrow}>
        <SignOutButton />
      </div>
    </NavigationStack>
  );
}
