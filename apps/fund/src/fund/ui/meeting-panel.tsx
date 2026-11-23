"use client";

import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr/UsersThree";
import * as stylex from "@stylexjs/stylex";
import { postJson } from "@tuja/auth-ui/fetch-json";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Card } from "@tuja/ui/components/card";
import { CardDescription } from "@tuja/ui/components/card-description";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import type { MeetingStatus } from "../meeting/meeting-status.ts";
import type { ActiveRunView } from "../views/load-desk.ts";
import { displayDate } from "./display-date.ts";
import { MeetingProgress } from "./meeting-progress.tsx";

interface RunState extends Omit<ActiveRunView, "asOf" | "status"> {
  /** Unknown for a run this page has just started. */
  asOf?: string;
  status: ActiveRunView["status"] | "completed";
}

const startAnswerSchema = z.object({
  status: z.enum(["started", "running", "completed", "blocked"]),
  runId: z.string().optional(),
});

const pollAnswerSchema = z.object({
  status: z.enum(["blocked", "running", "completed", "failed"]),
  held: z.boolean(),
  error: z.string().nullable(),
  steps: z.array(
    z.object({
      key: z.string(),
      role: z.enum(["system", "strategist", "analyst", "pm", "risk"]),
      status: z.enum(["pending", "running", "done", "failed", "skipped"]),
    }),
  ),
}) satisfies z.ZodType<MeetingStatus>;

const POLL_MS = 3000;
/**
 * A run that no worker holds for this many polls has paused at the time
 * limit of its request, or lost its worker. The page then asks the server
 * to continue it, and asks again after each such count of quiet polls.
 */
const QUIET_POLLS = 3;

const styles = stylex.create({
  error: {
    maxBlockSize: "12rem",
    overflowY: "auto",
    overflowWrap: "anywhere",
  },
});

/** The run as the route reports it, or null when the poll failed: the next tick tries again. */
async function fetchRun(id: string) {
  try {
    const response = await fetch(`/api/meetings/${id}`, { cache: "no-store" });
    if (!response.ok) return null;
    return pollAnswerSchema.parse(await response.json());
  } catch {
    return null;
  }
}

/**
 * The meeting on the Desk: the button that holds it, the reason when it
 * cannot be held, the seats at work while it runs, and the error with a way
 * to go on when it stops.
 */
export function MeetingPanel({
  hasThesis,
  pendingCount,
  doneToday,
  activeRun,
}: {
  hasThesis: boolean;
  pendingCount: number;
  doneToday: boolean;
  activeRun: ActiveRunView | null;
}) {
  const router = useRouter();
  const locale = useLocale();
  const [run, setRun] = useState<RunState | null>(activeRun);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastActiveRun, setLastActiveRun] = useState(activeRun);
  if (activeRun !== lastActiveRun) {
    setLastActiveRun(activeRun);
    if (activeRun !== null || run?.status !== "running") {
      setRun(activeRun);
    }
  }

  const runId = run?.status === "running" ? run.id : null;
  useEffect(() => {
    if (runId === null) return;
    const life = { stopped: false, quiet: 0 };
    const poll = () => {
      void fetchRun(runId).then((answer) => {
        if (answer === null || life.stopped) return;
        life.quiet =
          answer.status === "running" && !answer.held ? life.quiet + 1 : 0;
        if (life.quiet > 0 && life.quiet % QUIET_POLLS === 0) {
          postJson(`/api/meetings/${runId}/resume`, {}).catch(() => undefined);
        }
        const stalled = life.quiet > QUIET_POLLS;
        setRun((current) =>
          current === null || current.id !== runId
            ? current
            : {
                ...current,
                status:
                  answer.status === "completed"
                    ? "completed"
                    : answer.status === "failed"
                      ? "failed"
                      : "running",
                error: answer.error,
                stalled,
                steps: answer.steps,
              },
        );
        if (answer.status === "completed" || answer.status === "failed") {
          router.refresh();
        }
      });
    };
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      life.stopped = true;
      clearInterval(timer);
    };
  }, [runId, router]);

  const start = () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    postJson("/api/meetings", {})
      .then((json) => {
        const answer = startAnswerSchema.parse(json);
        if (
          (answer.status === "started" || answer.status === "running") &&
          answer.runId !== undefined
        ) {
          setRun({
            id: answer.runId,
            status: "running",
            error: null,
            stalled: false,
            steps: [],
          });
        } else {
          setNotice(answer.status);
          router.refresh();
        }
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const resume = (id: string) => {
    setBusy(true);
    setError(null);
    postJson(`/api/meetings/${id}/resume`, {})
      .then(() => {
        setRun((current) =>
          current === null
            ? current
            : { ...current, status: "running", error: null, stalled: false },
        );
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const noticeText =
    notice === "blocked"
      ? t({
          en: "Some orders still need your answer. Answer them above, then hold the meeting.",
          zh: "还有订单等你回答。请先在上方回答，再开会。",
        })
      : notice === "completed"
        ? t({
            en: "Today's meeting is already over.",
            zh: "今天的会议已经开过了。",
          })
        : null;

  let body;
  if (run !== null) {
    body = (
      <>
        <MeetingProgress
          steps={run.steps}
          meetingDone={run.status === "completed"}
        />
        {run.status === "failed" || run.stalled ? (
          <Callout
            intent={run.status === "failed" ? "destructive" : "warning"}
            title={
              run.status === "failed"
                ? t({ en: "The meeting stopped", zh: "会议中断了" })
                : t({
                    en: "The meeting has gone quiet",
                    zh: "会议没有动静了",
                  })
            }
            action={
              <Button
                size="sm"
                look="primary"
                icon={<ArrowClockwiseIcon weight="bold" />}
                loading={busy}
                onClick={() => {
                  resume(run.id);
                }}
              >
                {t({ en: "Continue", zh: "继续" })}
              </Button>
            }
          >
            {run.status === "failed" ? (
              <div css={stack.item}>
                <p>
                  {t({
                    en: "A step failed. Continue runs it again; the steps already done are kept.",
                    zh: "有一个步骤失败了。点“继续”会重跑这一步，已完成的步骤会保留。",
                  })}
                </p>
                {run.error === null ? null : (
                  <Disclosure
                    look="inline"
                    summary={t({ en: "What went wrong", zh: "出错详情" })}
                  >
                    <p css={styles.error}>{run.error}</p>
                  </Disclosure>
                )}
              </div>
            ) : (
              t({
                en: "It has stopped reporting. Continue picks it up from the first step that is not done.",
                zh: "它不再报告进度了。点“继续”会从第一个未完成的步骤接着开。",
              })
            )}
          </Callout>
        ) : null}
      </>
    );
  } else {
    const reason =
      pendingCount > 0
        ? (pendingCount === 1
            ? t({
                en: "Answer the order above first: the meeting has to know what the fund owns.",
                zh: "请先回答上面的订单：会议需要知道基金持有什么。",
              })
            : t({
                en: "Answer the {n} orders above first: the meeting has to know what the fund owns.",
                zh: "请先回答上面的 {n} 笔订单：会议需要知道基金持有什么。",
              })
          ).replace("{n}", String(pendingCount))
        : doneToday
          ? t({
              en: "Today's meeting is done. The next one is on the next trading morning.",
              zh: "今天的会议已经开过了。下一次在下个交易日早上。",
            })
          : null;
    body = (
      <div css={stack.item}>
        <Text as="p" look="bodySmall" tone="muted">
          {reason ??
            (hasThesis
              ? t({
                  en: "The strategist, an analyst for each stock, the portfolio manager and the risk officer meet before the open and agree today's orders. It takes a few minutes.",
                  zh: "开盘前，策略师、每只股票的分析师、基金经理和风控官一起开会，商定今天的订单。大约需要几分钟。",
                })
              : t({
                  en: "The fund has no investment thesis yet, so this first meeting also writes it, and the risk officer writes the risk policy. The team can already place orders today. After this one, a meeting is held each trading morning on its own.",
                  zh: "基金还没有投资逻辑，所以第一次会议也会写下它，风控官同时写下风险政策。今天就可以下单。之后每个交易日早上自动开会。",
                }))}
        </Text>
        <div>
          <Button
            look="primary"
            icon={<UsersThreeIcon weight="bold" />}
            loading={busy}
            disabled={reason !== null}
            onClick={start}
          >
            {t({ en: "Hold the morning meeting", zh: "召开晨会" })}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <div css={stack.item}>
        <CardHeader>
          <CardTitle level={2}>
            {t({ en: "Morning meeting", zh: "晨会" })}
          </CardTitle>
          {run?.status === "running" ? (
            <CardDescription>
              {t({
                en: "In session. You can leave this page. A long meeting pauses at times, and goes on when the Desk is open.",
                zh: "会议进行中。可以离开此页。会议较长时会中途暂停，打开交易台时会接着开。",
              })}
            </CardDescription>
          ) : run?.status === "failed" && run.asOf !== undefined ? (
            <CardDescription>
              {t({
                en: "The meeting of {date}",
                zh: "{date}的会议",
              }).replace("{date}", displayDate(run.asOf, locale, "weekday"))}
            </CardDescription>
          ) : null}
        </CardHeader>
        {body}
        {noticeText === null ? null : (
          <Callout intent="info">{noticeText}</Callout>
        )}
        {error === null ? null : (
          <Callout intent="destructive">{error}</Callout>
        )}
      </div>
    </Card>
  );
}
