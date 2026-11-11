"use client";

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { shrink } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlHeight, controlSize, rhythm } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  use,
  useState,
  useTransition,
} from "react";
import type {
  UndoOutcome,
  UndoRefusal,
} from "../activity/undo-agent-actions.ts";
import { assistantFetch } from "../http/assistant-fetch.ts";
import { AddressText } from "../mailboxes/address-text.tsx";
import { MailboxesLink } from "../mailboxes/mailboxes-link.tsx";
import { ReconnectCause } from "../mailboxes/reconnect-cause.tsx";
import { fillTemplate } from "../shell/fill-template.tsx";

type Refused = Extract<UndoOutcome, { undone: false }>;

/**
 * Refusals that a later try can get past: after a wait, or after the owner
 * connects the mailbox again. The others are final, such as a to-do changed
 * since.
 */
const RETRYABLE: ReadonlySet<UndoRefusal> = new Set([
  "login-refused",
  "login-failed",
  "failed",
]);

/**
 * A short state in the place of an Undo button. Its end lines up with the end
 * of the glyph or label of the button it replaces.
 */
export function UndoStateBadge({ children }: { children: ReactNode }) {
  return (
    <Badge size="sm" intent="neutral" css={[shrink._0, styles.stateBadge]}>
      {children}
    </Badge>
  );
}

function UndoGlyph() {
  return <ArrowCounterClockwiseIcon weight="bold" />;
}

/**
 * Why an undo was refused. A refusal that a later try can get past asks for
 * the owner's attention; a final one only tells.
 */
function RefusalText({ outcome }: { outcome: Refused }) {
  const retryable = RETRYABLE.has(outcome.refusal);
  return (
    <Text
      as="p"
      look="bodySmall"
      tone={retryable ? "destructive" : "muted"}
      measure="none"
    >
      {refusalText(outcome)}
    </Text>
  );
}

function refusalText(outcome: Refused): ReactNode {
  const folder = outcome.folder ?? "";
  const address = <AddressText address={outcome.address ?? ""} />;
  const mailboxes = <MailboxesLink />;
  switch (outcome.refusal) {
    case "mail-gone":
      return t({
        en: "The mail is no longer in {folder}, so it stays where it is now.",
        zh: "这封邮件已经不在“{folder}”里了，所以留在现在的位置。",
      }).replace("{folder}", folder);
    case "folder-gone":
      return t({
        en: "The folder {folder} no longer exists.",
        zh: "文件夹“{folder}”已经不存在了。",
      }).replace("{folder}", folder);
    case "folder-not-empty":
      return t({
        en: "{folder} holds mail now, so it stays.",
        zh: "“{folder}”里现在有邮件，所以保留它。",
      }).replace("{folder}", folder);
    case "folder-has-folders":
      return t({
        en: "{folder} holds other folders now, so it stays.",
        zh: "“{folder}”里现在有其他文件夹，所以保留它。",
      }).replace("{folder}", folder);
    case "folder-exists":
      return t({
        en: "A folder named {folder} exists already.",
        zh: "已经有名为“{folder}”的文件夹了。",
      }).replace("{folder}", folder);
    case "event-gone":
      return t({
        en: "The event is no longer in your calendar.",
        zh: "这个日程已经不在日历里了。",
      });
    case "event-changed":
      return t({
        en: "The event has changed in your calendar since, so it stays as it is.",
        zh: "这个日程之后在日历里改过，所以保持现状。",
      });
    case "todo-gone":
      return t({
        en: "That to-do has been deleted.",
        zh: "这个待办已经删除了。",
      });
    case "todo-changed":
      return t({
        en: "That to-do has changed since, so it stays as it is.",
        zh: "这个待办之后改过，所以保持现状。",
      });
    case "todo-closed":
      return t({
        en: "That to-do is closed now, so it stays as it is.",
        zh: "这个待办已经关闭了，所以保持现状。",
      });
    case "account-gone":
      return t({
        en: "That mailbox is no longer connected.",
        zh: "这个邮箱已经断开连接了。",
      });
    case "login-refused":
      return fillTemplate(
        t({
          en: "Could not sign in to {address}, so nothing changed. {cause} Connect it again in {mailboxes}, then undo.",
          zh: "无法登录 {address}，所以没有改动。{cause}请在{mailboxes}中重新连接后再撤销。",
        }),
        { address, mailboxes, cause: <ReconnectCause code={outcome.code} /> },
      );
    case "login-failed":
      return fillTemplate(
        t({
          en: "Could not log in to {address}, so nothing changed. Try again later.",
          zh: "暂时登录不了 {address}，所以没有改动。请稍后再试。",
        }),
        { address },
      );
    case "failed":
      return outcome.address
        ? fillTemplate(
            t({
              en: "The server of {address} did not do it. Try again later.",
              zh: "{address} 的服务器没有完成操作，请稍后再试。",
            }),
            { address },
          )
        : t({
            en: "The mail or calendar server did not do it. Try again later.",
            zh: "邮件或日历服务器没有完成操作，请稍后再试。",
          });
  }
}

interface UndoState {
  confirm: string | undefined;
  asking: boolean;
  busy: boolean;
  refused: Refused[];
  undone: number;
  failed: boolean;
  run: () => void;
  setAsking: (asking: boolean) => void;
}

const UndoContext = createContext<UndoState | null>(null);

function useUndo() {
  const undo = use(UndoContext);
  if (!undo) throw new Error("UndoButton and UndoStatus need an UndoScope");
  return undo;
}

/**
 * Holds one undo: some actions, or a whole run. `UndoButton` starts it, and
 * `UndoStatus` says what could not be undone, with why, so the two can sit in
 * different columns of a row. A run asks once more first, and a done undo
 * loads the page again.
 */
export function UndoScope({
  target,
  confirm,
  children,
}: {
  target: { actionIds: string[] } | { runId: string };
  /** Asked before a larger undo, such as a whole run. */
  confirm?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [refused, setRefused] = useState<Refused[]>([]);
  const [undone, setUndone] = useState(0);
  const [failed, setFailed] = useState(false);

  function run() {
    setAsking(false);
    setBusy(true);
    setFailed(false);
    assistantFetch("/api/activity/undo", {
      method: "POST",
      body: JSON.stringify(target),
    })
      .then(async (response) => {
        const { outcomes } = (await response.json()) as {
          outcomes: UndoOutcome[];
        };
        setRefused(outcomes.filter((outcome) => !outcome.undone));
        setUndone(outcomes.filter((outcome) => outcome.undone).length);
        startTransition(() => {
          router.refresh();
        });
      })
      .catch(() => {
        setFailed(true);
      })
      .finally(() => {
        setBusy(false);
      });
  }

  return (
    <UndoContext
      value={{
        confirm,
        asking,
        busy,
        refused,
        undone,
        failed,
        run,
        setAsking,
      }}
    >
      {children}
    </UndoContext>
  );
}

/**
 * The Undo button of the nearest `UndoScope`. When every refusal is one that
 * no later try can get past, a "Can’t undo" badge takes its place.
 */
export function UndoButton({
  label,
  compact = false,
  describedBy,
}: {
  label: string;
  /** Show only the icon below `md`, so the row's text gets the width. */
  compact?: boolean;
  /** The id of the text that says what the undo takes back. */
  describedBy?: string;
}) {
  const { confirm, asking, busy, refused, run, setAsking } = useUndo();
  const stuck =
    refused.length > 0 &&
    refused.every((outcome) => !RETRYABLE.has(outcome.refusal));
  return (
    <div css={[typeRole.body, styles.buttons]}>
      {stuck ? (
        <UndoStateBadge>
          {t({ en: "Can’t undo", zh: "无法撤销" })}
        </UndoStateBadge>
      ) : asking ? (
        <>
          <Button size="sm" look="outline" onClick={run}>
            {confirm}
          </Button>
          <Button
            size="sm"
            look="ghost"
            onClick={() => {
              setAsking(false);
            }}
          >
            {t({ en: "Keep", zh: "保留" })}
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          look="ghost"
          loading={busy}
          disabled={busy}
          icon={<UndoGlyph />}
          hideLabelOnMobile={compact}
          aria-label={compact ? label : undefined}
          aria-describedby={describedBy}
          onClick={() => {
            if (confirm) setAsking(true);
            else run();
          }}
        >
          {label}
        </Button>
      )}
    </div>
  );
}

/**
 * What the undo of the nearest `UndoScope` could not do, with why, under the
 * text of its row. It is empty until an undo answers.
 */
export function UndoStatus({ css }: { css?: StyleProp }) {
  const { refused, undone, failed } = useUndo();
  const distinct = [
    ...new Map(
      refused.map((outcome) => [
        `${outcome.refusal}:${outcome.folder ?? ""}:${outcome.address ?? ""}`,
        outcome,
      ]),
    ),
  ];
  return (
    <div role="status" css={[stack.text, styles.status, css]}>
      {refused.length > 0 && undone > 0 ? (
        <Text as="p" look="bodySmall" tone="muted" measure="none">
          {t({
            en: "Undid {done} of {all}.",
            zh: "撤销了 {all} 项中的 {done} 项。",
          })
            .replace("{done}", String(undone))
            .replace("{all}", String(undone + refused.length))}
        </Text>
      ) : null}
      {distinct.map(([key, outcome]) => (
        <RefusalText key={key} outcome={outcome} />
      ))}
      {failed ? (
        <Text as="p" look="bodySmall" tone="destructive" measure="none">
          {t({
            en: "That did not go through. Try again.",
            zh: "没有成功，请重试。",
          })}
        </Text>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  buttons: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: rhythm.inline,
    whiteSpace: "nowrap",
    marginBlock: `calc((1lh - ${controlHeight.sm}) / 2)`,
  },
  status: {
    marginBlockStart: { default: 0, ":not(:empty)": rhythm.inline },
  },
  stateBadge: {
    marginInlineEnd: controlSize._2,
  },
});
