import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowsMergeIcon } from "@phosphor-icons/react/dist/ssr/ArrowsMerge";
import { ArrowUUpLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowUUpLeft";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { CalendarPlusIcon } from "@phosphor-icons/react/dist/ssr/CalendarPlus";
import { CalendarXIcon } from "@phosphor-icons/react/dist/ssr/CalendarX";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { EnvelopeOpenIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeOpen";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { FlagIcon } from "@phosphor-icons/react/dist/ssr/Flag";
import { FolderSimpleIcon } from "@phosphor-icons/react/dist/ssr/FolderSimple";
import { FolderSimpleMinusIcon } from "@phosphor-icons/react/dist/ssr/FolderSimpleMinus";
import { FolderSimplePlusIcon } from "@phosphor-icons/react/dist/ssr/FolderSimplePlus";
import { HourglassIcon } from "@phosphor-icons/react/dist/ssr/Hourglass";
import { ListPlusIcon } from "@phosphor-icons/react/dist/ssr/ListPlus";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Disclosure } from "@tuja/ui/components/disclosure";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Text } from "@tuja/ui/components/text";
import { flex, shrink } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { type ReactNode, useId } from "react";
import type {
  ActivityItem,
  ActivityMail,
  TodoFieldChange,
} from "../activity/read-activity.ts";
import type { TodoPlainField } from "../agent/todos/todo-action-detail.ts";
import { fillTemplate } from "../shell/fill-template.tsx";
import { keepHyphenated } from "../shell/keep-hyphenated.tsx";
import { Quoted } from "../shell/quoted.tsx";
import { formatEventStart, ItemSentence } from "./item-sentence.tsx";
import {
  UndoButton,
  UndoScope,
  UndoStateBadge,
  UndoStatus,
} from "./undo-button.tsx";

function todoFieldNames(): Record<TodoPlainField, string> {
  return {
    title: t({ en: "Title", zh: "标题" }),
    detail: t({ en: "Detail", zh: "详情" }),
    dueDate: t({ en: "Due date", zh: "到期日" }),
    startDate: t({ en: "Start date", zh: "开始日期" }),
  };
}

function TodoChangeLine({
  change: { field, from, to },
  dateLocale,
}: {
  change: TodoFieldChange;
  dateLocale: string;
}) {
  const none = t({ en: "none", zh: "无" });
  const date = (value: string | null) =>
    value ? formatEventStart(value, dateLocale) : none;
  const name = todoFieldNames()[field];
  return (
    <Text as="p" look="bodySmall" tone="muted">
      {field === "detail"
        ? t({ en: "The detail changed", zh: "详情有改动" })
        : fillTemplate(
            t({ en: "{name}: {from} → {to}", zh: "{name}：{from} → {to}" }),
            field === "title"
              ? {
                  name,
                  from: <Quoted text={from ?? ""} />,
                  to: <Quoted text={to ?? ""} />,
                }
              : { name, from: date(from), to: date(to) },
          )}
    </Text>
  );
}

function KeptNote({ fields }: { fields: readonly TodoPlainField[] }) {
  const names = todoFieldNames();
  return (
    <Text as="p" look="bodySmall" tone="muted">
      {t({
        en: "These changed since, so they stay as they are: {fields}",
        zh: "这些内容之后改过，所以保持现状：{fields}",
      }).replace(
        "{fields}",
        fields.map((field) => names[field]).join(t({ en: ", ", zh: "、" })),
      )}
    </Text>
  );
}

const KIND_GLYPHS: Record<
  Exclude<ActivityItem, { type: "merge" }>["kind"],
  ReactNode
> = {
  move: <ArrowRightIcon weight="regular" />,
  mark_read: <EnvelopeOpenIcon weight="regular" />,
  mark_unread: <EnvelopeSimpleIcon weight="regular" />,
  flag: <FlagIcon weight="regular" />,
  unflag: <FlagIcon weight="regular" />,
  create_folder: <FolderSimplePlusIcon weight="regular" />,
  rename_folder: <FolderSimpleIcon weight="regular" />,
  delete_folder: <FolderSimpleMinusIcon weight="regular" />,
  create_event: <CalendarPlusIcon weight="regular" />,
  update_event: <CalendarDotsIcon weight="regular" />,
  delete_event: <CalendarXIcon weight="regular" />,
  add_todo: <ListPlusIcon weight="regular" />,
  update_todo: <PencilSimpleIcon weight="regular" />,
  complete_todo: <CheckCircleIcon weight="regular" />,
  mark_waiting: <HourglassIcon weight="regular" />,
  reply_came: <ArrowUUpLeftIcon weight="regular" />,
};

function UndoneBadge() {
  return <UndoStateBadge>{t({ en: "Undone", zh: "已撤销" })}</UndoStateBadge>;
}

/** An `UndoScope` around the children while there is something to undo. */
function MaybeUndoScope({
  actionIds,
  children,
}: {
  actionIds: string[];
  children: ReactNode;
}) {
  return actionIds.length === 0 ? (
    children
  ) : (
    <UndoScope target={{ actionIds }}>{children}</UndoScope>
  );
}

function MailList({ mails }: { mails: readonly ActivityMail[] }) {
  const undo = t({ en: "Undo", zh: "撤销" });
  const id = useId();
  return (
    <ul css={stack.rows}>
      {mails.map((mail) => (
        <li key={mail.actionId} css={styles.mailRow}>
          <MaybeUndoScope actionIds={mail.undone ? [] : [mail.actionId]}>
            <div css={[stack.text, styles.grow]}>
              <Text
                id={`${id}-${mail.actionId}`}
                look="bodySmall"
                tone={mail.undone ? "muted" : "default"}
                verbatim
              >
                <Quoted text={mail.subject} lift={false} />
              </Text>
              {mail.sender ? (
                <Text look="bodySmall" tone="muted">
                  {mail.sender}
                </Text>
              ) : null}
              {mail.undone ? null : <UndoStatus />}
            </div>
            <div css={styles.mailAction}>
              {mail.undone ? (
                <UndoneBadge />
              ) : (
                <UndoButton
                  label={undo}
                  compact
                  describedBy={`${id}-${mail.actionId}`}
                />
              )}
            </div>
          </MaybeUndoScope>
        </li>
      ))}
    </ul>
  );
}

function actionIdsOf(item: ActivityItem) {
  if (item.type === "mail") {
    return item.mails.filter((mail) => !mail.undone).map((m) => m.actionId);
  }
  if (item.type === "merge") {
    return [
      ...(item.undone ? [] : [item.actionId]),
      ...item.mails.filter((mail) => !mail.undone).map((m) => m.actionId),
    ];
  }
  return item.undone ? [] : [item.actionId];
}

export function ItemRow({
  item,
  dateLocale,
}: {
  item: ActivityItem;
  dateLocale: string;
}) {
  const pending = actionIdsOf(item);
  const undone = pending.length === 0;
  const mails = item.type === "mail" || item.type === "merge" ? item.mails : [];
  const showMails = mails.length > 1 || item.type === "merge";
  const sentenceId = useId();
  return (
    <FlowBlock as="li" css={listSurface.item}>
      <div css={[listSurface.row, styles.row]}>
        <span
          css={[typeRole.body, flex.row, shrink._0, styles.glyph]}
          aria-hidden
        >
          {item.type === "merge" ? (
            <ArrowsMergeIcon weight="regular" />
          ) : (
            KIND_GLYPHS[item.kind]
          )}
        </span>
        <div css={[stack.text, styles.grow]}>
          <div css={styles.head}>
            <MaybeUndoScope actionIds={pending}>
              <Text
                as="p"
                id={sentenceId}
                tone={undone ? "muted" : "default"}
                verbatim
                measure="none"
              >
                <ItemSentence item={item} dateLocale={dateLocale} />
              </Text>
              <div css={[stack.text, typeModifier.verbatim, styles.wide]}>
                <Text as="p" look="bodySmall" tone="muted">
                  {keepHyphenated(item.reason)}
                </Text>
                {item.type === "todo"
                  ? item.changes.map((change) => (
                      <TodoChangeLine
                        key={change.field}
                        change={change}
                        dateLocale={dateLocale}
                      />
                    ))
                  : null}
                {item.type === "todo" && item.kept.length > 0 ? (
                  <KeptNote fields={item.kept} />
                ) : null}
                {item.type === "event" && item.sourceSubject ? (
                  <Text as="p" look="bodySmall" tone="muted">
                    {fillTemplate(
                      t({
                        en: "From the mail {subject}",
                        zh: "来自邮件 {subject}",
                      }),
                      {
                        subject: <Quoted text={item.sourceSubject} />,
                      },
                    )}
                  </Text>
                ) : null}
                {item.type === "mail" &&
                mails.length === 1 &&
                mails[0].sender ? (
                  <Text as="p" look="bodySmall" tone="muted">
                    {t({ en: "From {sender}", zh: "来自 {sender}" }).replace(
                      "{sender}",
                      mails[0].sender,
                    )}
                  </Text>
                ) : null}
                {undone ? null : <UndoStatus />}
              </div>
              <div css={[typeRole.body, styles.action]}>
                {undone ? (
                  <UndoneBadge />
                ) : (
                  <UndoButton
                    label={t({ en: "Undo", zh: "撤销" })}
                    compact
                    describedBy={sentenceId}
                  />
                )}
              </div>
            </MaybeUndoScope>
          </div>
          {showMails ? (
            <Disclosure
              look="inline"
              summary={
                mails.length === 1
                  ? t({ en: "1 mail", zh: "1 封邮件" })
                  : t({ en: "{count} mails", zh: "{count} 封邮件" }).replace(
                      "{count}",
                      String(mails.length),
                    )
              }
            >
              <MailList mails={mails} />
            </Disclosure>
          ) : null}
        </div>
      </div>
    </FlowBlock>
  );
}

const styles = stylex.create({
  row: {
    alignItems: "flex-start",
    paddingBlock: space._2,
  },
  head: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) fit-content(50%)",
    alignItems: "start",
    columnGap: { default: rhythm.tight, [breakpoints.md]: rhythm.item },
  },
  wide: {
    gridColumn: "1 / -1",
  },
  action: {
    gridColumn: 2,
    gridRow: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    minBlockSize: "1lh",
    justifyContent: "center",
  },
  grow: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  glyph: {
    blockSize: "1lh",
    color: color.fgMuted,
  },
  mailRow: {
    display: "flex",
    alignItems: "center",
    gap: { default: rhythm.tight, [breakpoints.md]: rhythm.item },
    paddingBlock: space._1,
  },
  mailAction: {
    flexShrink: 0,
    maxInlineSize: "50%",
  },
});
