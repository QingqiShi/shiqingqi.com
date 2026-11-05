"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Textarea } from "@tuja/ui/components/textarea";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { displayDay } from "../domain/dates/display-day.ts";
import { DateChips } from "./date-chips.tsx";
import { FieldLabel } from "./field-label.tsx";
import { latestValuationFrom } from "./find-duplicate.ts";
import { TagPickerSlot } from "./tag-picker-slot.tsx";
import type { TransactionForm } from "./use-transaction-form.ts";

export function DetailFields({ form }: { form: TransactionForm }) {
  const { data, draft, locale, isExpected, update, isActiveMember, labelMark } =
    form;
  const removedMember =
    draft.memberId === null || isActiveMember(draft.memberId)
      ? undefined
      : data.lookups.memberById.get(draft.memberId);
  const memberChoices = removedMember
    ? [...data.members, removedMember]
    : data.members;
  const valuation = latestValuationFrom(
    data.valuations,
    [
      draft.accountId,
      draft.kind === "transfer" ? draft.toAccountId : null,
    ].filter((id): id is string => id !== null),
    draft.date,
  );

  return (
    <div css={stack.item}>
      <DateChips
        value={draft.date}
        today={data.today}
        mark={labelMark("date")}
        onChange={(date) => {
          update({ date }, ["date"]);
        }}
      />
      {valuation && valuation.on >= draft.date && !isExpected ? (
        <Callout intent="info">
          {`${t({
            en: "On or before the balance set on",
            zh: "此日期不晚于",
          })} ${displayDay(valuation.on, locale, "weekday")}${t({
            en: ", so the balance will not change.",
            zh: "的余额记录，余额不会变化。",
          })}`}
        </Callout>
      ) : null}

      {memberChoices.length > 1 ? (
        <div
          role="group"
          aria-labelledby="finance-editor-member"
          css={stack.tight}
        >
          <FieldLabel id="finance-editor-member" mark={labelMark("member")}>
            {t({ en: "Member", zh: "成员" })}
          </FieldLabel>
          <div css={cluster.tight}>
            {memberChoices.map((member) => (
              <Button
                look="outline"
                key={member.id}
                size="xs"
                isActive={draft.memberId === member.id}
                onClick={() => {
                  update({ memberId: member.id }, ["member"]);
                }}
              >
                {member.name}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <TagPickerSlot
        data={data}
        value={draft.tagIds}
        mark={labelMark("tags")}
        onChange={(tagIds) => {
          update({ tagIds }, ["tags"]);
        }}
      />

      <Textarea
        label={t({ en: "Note", zh: "备注" })}
        rows={2}
        autoGrow
        value={draft.note}
        onChange={(event) => {
          update({ note: event.target.value });
        }}
      />
    </div>
  );
}
