"use client";

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { WifiSlashIcon } from "@phosphor-icons/react/dist/ssr/WifiSlash";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { headerControlsTokens } from "@tuja/ui/components/header-controls.stylex";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { useSplitViewColumn } from "@tuja/ui/components/navigation-split-view";
import { Sheet } from "@tuja/ui/components/sheet";
import {
  StickyControlGroup,
  StickyControls,
} from "@tuja/ui/components/sticky-controls";
import { Text } from "@tuja/ui/components/text";
import { useToast } from "@tuja/ui/components/toast-provider";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { NewTripNotice } from "#src/new-trip/new-trip-notice.tsx";
import { dateRangeLabel } from "#src/reader/date-label.ts";
import { TripLanguageProvider, TripText } from "#src/reader/trip-text.tsx";
import { dayAnchorId, useTripHash } from "#src/reader/use-trip-location.ts";
import type { Trip } from "#src/trips/types.ts";
import { AddPanel } from "./add-panel.tsx";
import { ASK_ROW, AskBar, EditorToasts } from "./ask-bar.tsx";
import { AskProvider, useAsk } from "./ask-provider.tsx";
import { buildOutline } from "./build-outline.ts";
import { ConflictView } from "./conflict-view.tsx";
import { DayForm } from "./day-form.tsx";
import { DayGroup } from "./day-group.tsx";
import { EditorProvider, useEditor } from "./editor-provider.tsx";
import { ItemForm } from "./item-form.tsx";
import { pressTarget } from "./item-row.tsx";
import { MomentForm } from "./moment-form.tsx";
import { ProposalView } from "./proposal-view.tsx";
import { RemoveDayView } from "./remove-day-view.tsx";
import { SheetActions } from "./sheet-actions.tsx";
import { SheetInputContext } from "./sheet-input-context.ts";
import { TripForm } from "./trip-form.tsx";
import type { OpenSheet, SheetTarget } from "./types.ts";
import { useDayChanges } from "./use-day-changes.ts";
import { useDayLabels } from "./use-day-labels.ts";
import { useKindLabels } from "./use-field-labels.ts";
import { useLeaveGuard } from "./use-leave-guard.ts";

const TRIP_ROW = "trip";

interface OpenedSheet {
  target: SheetTarget;
  /** The row that the sheet grows from and goes back into. */
  rowId: string;
  /** Changes at each open, so that the form starts from the trip as it is then. */
  key: number;
}

function useSheetTitle() {
  const kindLabels = useKindLabels();
  const dayLabels = useDayLabels();
  const addTo = t({ en: "Add to {day}", zh: "添加到{day}" });
  const note = t({ en: "Note", zh: "事项" });
  const dayDetails = t({ en: "{day} details", zh: "{day}详情" });
  const tripDetails = t({ en: "Trip details", zh: "行程详情" });
  const removeDay = t({ en: "Remove {day}?", zh: "移除{day}？" });
  const conflict = t({ en: "Changed by someone else", zh: "其他人也改了这里" });
  const leave = t({ en: "A change is not saved", zh: "有修改尚未保存" });
  const proposed = t({ en: "Proposed changes", zh: "修改建议" });
  const reply = t({ en: "Reply", zh: "回复" });
  const isReply = useAsk().answer?.batches.length === 0;
  return (target: SheetTarget) => {
    switch (target.kind) {
      case "item":
        return kindLabels[target.found.item.type];
      case "add":
        return addTo.replace("{day}", dayLabels.byId(target.dayId));
      case "moment":
        return note;
      case "day":
        return dayDetails.replace("{day}", dayLabels.byId(target.day.id));
      case "removeDay":
        return removeDay.replace("{day}", dayLabels.byId(target.day.id));
      case "trip":
        return tripDetails;
      case "conflict":
        return conflict;
      case "proposal":
        return isReply ? reply : proposed;
      case "leave":
        return leave;
    }
  };
}

function EditorScreen() {
  const editor = useEditor();
  const { state, queue, trip, canEdit, isOnline } = editor;
  const locale = useLocale();
  const router = useRouter();
  const column = useSplitViewColumn();
  const hash = useTripHash();
  const sheetTitle = useSheetTitle();
  const [sheet, setSheet] = useState<OpenedSheet | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [shownConflict, setShownConflict] = useState<number | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  // Where the person asked to go: another page of the app, or null for the
  // reader.
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  // Whether the person typed or chose a thing in the sheet that is open.
  const [hasInput, setHasInput] = useState(false);
  const [isAskingToDiscard, setIsAskingToDiscard] = useState(false);
  const dayChanges = useDayChanges();
  const ask = useAsk();
  const [shownAnswer, setShownAnswer] = useState<number | null>(null);

  const forgetInput = () => {
    setHasInput(false);
  };
  const markInput = () => {
    setHasInput(true);
  };
  const openSheet: OpenSheet = (target, rowId) => {
    forgetInput();
    setIsAskingToDiscard(false);
    setSheet((current) => ({ target, rowId, key: (current?.key ?? 0) + 1 }));
    setIsOpen(true);
  };
  const close = (rowId?: string) => {
    if (rowId) setSheet((current) => current && { ...current, rowId });
    setIsOpen(false);
  };

  const { problem } = state;
  const conflictRow = problem?.batch.touches[0] ?? TRIP_ROW;
  // A conflict opens the sheet by itself, one time. A person who closes it
  // without a choice finds it again on the row and at the top of the screen.
  // `isOpen` is still the old value after an `openSheet` in this render.
  let opensNow = false;
  if (problem?.kind === "conflict" && shownConflict !== problem.batch.id) {
    setShownConflict(problem.batch.id);
    openSheet({ kind: "conflict" }, conflictRow);
    opensNow = true;
  }
  if (isLeaving && problem) {
    setIsLeaving(false);
    openSheet({ kind: "leave" }, TRIP_ROW);
    opensNow = true;
  }
  const { answer } = ask;
  const reviewAnswer = () => {
    openSheet({ kind: "proposal" }, ASK_ROW);
  };
  // An answer opens the sheet by itself, one time. It waits for a sheet
  // that the person has open, because a reply with no change has no other
  // way to show.
  if (answer && shownAnswer !== answer.id && !isOpen && !opensNow) {
    setShownAnswer(answer.id);
    reviewAnswer();
  }

  const readerPath = getLocalePath(`/${editor.tripId}`, locale);
  const go = (to: string | null) => {
    if (to !== null) router.push(to);
    else if (column?.close) column.close();
    else router.push(readerPath + hash);
  };
  const leave = () => {
    go(leaveTo);
  };
  const leaveWhenSaved = useEffectEvent(leave);
  const isSaved = state.pending.length === 0;
  useEffect(() => {
    if (isLeaving && isSaved) leaveWhenSaved();
  }, [isLeaving, isSaved]);
  // A change that is not saved holds the person on the screen: the change
  // goes first, and a change that cannot go asks before it is lost.
  const askToLeave = (href: string | null) => {
    const to = href?.split("#")[0] === readerPath ? null : href;
    setLeaveTo(to);
    if (isSaved) go(to);
    else if (problem) openSheet({ kind: "leave" }, TRIP_ROW);
    else setIsLeaving(true);
  };
  useLeaveGuard(!isSaved, askToLeave);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    // The first day shows from the top of the screen, under the trip.
    if (id && id !== dayAnchorId(0)) {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    }
  }, []);

  const status = !isOnline
    ? t({ en: "Offline", zh: "离线" })
    : problem
      ? t({ en: "Not saved", zh: "未保存" })
      : !isSaved
        ? t({ en: "Saving…", zh: "正在保存…" })
        : editor.hasChanged
          ? t({ en: "Saved", zh: "已保存" })
          : null;
  const discarded = t({ en: "Change discarded", zh: "已放弃修改" });
  const showToast = useToast();
  const facts = (
    <>
      {dateRangeLabel(trip.days, locale)}
      {trip.party ? (
        <>
          {" · "}
          <TripText>{trip.party}</TripText>
        </>
      ) : null}
    </>
  );

  return (
    <div css={stack.group}>
      <StickyControls css={styles.bar}>
        <StickyControlGroup css={row.tight}>
          <span role="status">
            {status ? (
              <Badge intent={problem ? "destructive" : "neutral"}>
                {status}
              </Badge>
            ) : null}
          </span>
          <Button
            icon={<ArrowCounterClockwiseIcon weight="bold" />}
            disabled={!state.canUndo || !canEdit}
            onClick={editor.undo}
          >
            {t({ en: "Undo", zh: "撤销" })}
          </Button>
          <Button
            look="primary"
            loading={isLeaving}
            onClick={() => {
              askToLeave(null);
            }}
          >
            {t({ en: "Done", zh: "完成" })}
          </Button>
        </StickyControlGroup>
      </StickyControls>

      {state.isGone ? (
        <Callout
          intent="warning"
          action={
            <Button size="sm" href={getLocalePath("/", locale)}>
              {t({ en: "All trips", zh: "全部行程" })}
            </Button>
          }
        >
          {t({
            en: "You can no longer change this trip: it was deleted, or you are no longer on it.",
            zh: "你已无法修改这个行程：它已被删除，或你已不在其中。",
          })}
        </Callout>
      ) : !isOnline ? (
        <Callout intent="neutral" icon={<WifiSlashIcon weight="bold" />}>
          {t({
            en: "You are offline, so you cannot change the trip now. Editing comes back with the connection.",
            zh: "你现在处于离线状态，暂时不能修改行程。恢复连接后即可继续编辑。",
          })}
        </Callout>
      ) : problem?.kind === "failed" ? (
        <Callout
          intent="destructive"
          action={
            <div css={row.tight}>
              <Button
                size="sm"
                look="ghost"
                onClick={() => {
                  queue.discard();
                  // This takes the place of the toast that offers to undo
                  // the change.
                  showToast({ message: discarded });
                }}
              >
                {t({ en: "Discard it", zh: "放弃修改" })}
              </Button>
              <Button size="sm" onClick={queue.retry}>
                {t({ en: "Try again", zh: "重试" })}
              </Button>
            </div>
          }
        >
          {t({
            en: "A change is not saved. The changes after it wait for it.",
            zh: "有一项修改没有保存，之后的修改都在等它。",
          })}
        </Callout>
      ) : problem?.kind === "conflict" && !isOpen ? (
        <Callout
          intent="warning"
          action={
            <Button
              size="sm"
              onClick={() => {
                openSheet({ kind: "conflict" }, conflictRow);
              }}
            >
              {t({ en: "Choose", zh: "选择" })}
            </Button>
          }
        >
          {t({
            en: "Someone else changed the same thing. Your later changes wait until you choose a version.",
            zh: "其他人改了同一处。选好保留哪个版本后，你之后的修改才会保存。",
          })}
        </Callout>
      ) : null}

      <List aria-label={t({ en: "Trip", zh: "行程" })}>
        <ListRow
          ref={editor.rowRef(TRIP_ROW)}
          wrap
          detail={trip.subtitle ? <TripText>{trip.subtitle}</TripText> : facts}
          extra={trip.subtitle ? <span>{facts}</span> : undefined}
          trailing={
            <Text as="span" look="caption" tone="muted">
              {t({ en: "Trip details", zh: "行程详情" })}
            </Text>
          }
          {...pressTarget(
            canEdit
              ? () => {
                  openSheet({ kind: "trip" }, TRIP_ROW);
                }
              : null,
          )}
        >
          <TripText>{trip.title}</TripText>
        </ListRow>
      </List>

      {buildOutline(trip).map((outline) => (
        <DayGroup
          key={outline.day.id}
          outline={outline}
          openSheet={openSheet}
        />
      ))}

      <div>
        <Button
          icon={<PlusIcon weight="bold" />}
          disabled={!canEdit}
          onClick={() => {
            dayChanges.add();
          }}
        >
          {t({ en: "Add a day", zh: "添加一天" })}
        </Button>
      </div>

      <AskBar
        isReviewing={isOpen && sheet?.target.kind === "proposal"}
        onReview={reviewAnswer}
      />

      <Sheet
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        // A sheet that holds what the person typed asks one time before it
        // goes. A second request to close is the answer.
        canClose={() => {
          if (!hasInput || isAskingToDiscard) return true;
          setIsAskingToDiscard(true);
          return false;
        }}
        closeLabel={t({ en: "Close", zh: "关闭" })}
        title={
          isAskingToDiscard
            ? t({ en: "Discard what you entered?", zh: "放弃已填写的内容？" })
            : sheet
              ? sheetTitle(sheet.target)
              : ""
        }
        liftFrom={() => (sheet ? editor.rowElement(sheet.rowId) : null)}
      >
        {isAskingToDiscard ? (
          <div css={stack.item}>
            <Text as="p" tone="muted">
              {t({
                en: "It is not saved. If you close this, it is lost.",
                zh: "这些内容还没有保存，关闭后就会丢失。",
              })}
            </Text>
            <SheetActions>
              <Button
                look="ghost"
                intent="destructive"
                onClick={() => {
                  setIsOpen(false);
                }}
              >
                {t({ en: "Discard", zh: "放弃" })}
              </Button>
              <Button
                look="primary"
                autoFocus
                onClick={() => {
                  setIsAskingToDiscard(false);
                }}
              >
                {t({ en: "Keep editing", zh: "继续编辑" })}
              </Button>
            </SheetActions>
          </div>
        ) : null}
        {sheet ? (
          // The form stays as it is while the question shows.
          <div
            css={isAskingToDiscard && styles.hidden}
            onInput={markInput}
            onChange={markInput}
          >
            <SheetInputContext value={markInput}>
              <SheetContent
                key={sheet.key}
                target={sheet.target}
                onDone={close}
                onLeave={leave}
                onFresh={forgetInput}
                onReview={reviewAnswer}
              />
            </SheetInputContext>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

function SheetContent({
  target,
  onDone,
  onLeave,
  onFresh,
  onReview,
}: {
  target: SheetTarget;
  onDone: (rowId?: string) => void;
  onLeave: () => void;
  /** Called when a form starts again with nothing in it that the person typed. */
  onFresh: () => void;
  onReview: () => void;
}) {
  const { queue } = useEditor();
  switch (target.kind) {
    case "item":
      return <ItemForm target={{ found: target.found }} onDone={onDone} />;
    case "add":
      return (
        <AddPanel dayId={target.dayId} onDone={onDone} onFresh={onFresh} />
      );
    case "moment":
      return <MomentForm target={target} onDone={onDone} />;
    case "day":
      return <DayForm day={target.day} onDone={onDone} />;
    case "removeDay":
      return (
        <RemoveDayView
          day={target.day}
          onDone={() => {
            onDone();
          }}
        />
      );
    case "trip":
      return <TripForm onDone={onDone} />;
    case "conflict":
      return <ConflictView onDone={onDone} />;
    case "proposal":
      return <ProposalView onDone={onDone} onReview={onReview} />;
    case "leave":
      return (
        <div css={stack.item}>
          <Text as="p" tone="muted">
            {t({
              en: "Your last change did not reach the server. If you leave now, it is lost.",
              zh: "你最近的修改没有传到服务器。现在离开，它就会丢失。",
            })}
          </Text>
          <SheetActions>
            <Button
              look="ghost"
              intent="destructive"
              onClick={() => {
                onDone();
                onLeave();
              }}
            >
              {t({ en: "Leave without it", zh: "不保存并离开" })}
            </Button>
            <Button
              look="primary"
              onClick={() => {
                queue.retry();
                onDone();
              }}
            >
              {t({ en: "Stay and try again", zh: "留下并重试" })}
            </Button>
          </SheetActions>
        </div>
      );
  }
}

/**
 * The edit screen of a trip: an outline of every day, where each row opens
 * a sheet that changes it, and each change saves at once. The prompt at the
 * bottom of the screen asks the model for changes, which the person accepts
 * one by one.
 */
export function TripEditor({
  tripId,
  trip,
  isOwner,
}: {
  tripId: string;
  /** The trip as the server has it when the screen opens. */
  trip: Trip;
  isOwner: boolean;
}) {
  // The toasts of the app stay when the person leaves this screen. The
  // toasts of the screen itself go with it.
  const showAppToast = useToast();
  return (
    <EditorToasts>
      <NewTripNotice />
      <EditorProvider
        tripId={tripId}
        trip={trip}
        isOwner={isOwner}
        announce={(message) => {
          showAppToast({ message });
        }}
      >
        <TripLanguageProvider language={trip.language}>
          <AskProvider>
            <EditorScreen />
          </AskProvider>
        </TripLanguageProvider>
      </EditorProvider>
    </EditorToasts>
  );
}

const styles = stylex.create({
  // The bar is narrower than nine tenths of the screen. Safari on iOS takes
  // the colour of its status bar from a sticky box that is as wide as the
  // screen.
  bar: {
    alignSelf: "flex-end",
    inlineSize: "fit-content",
    insetBlockStart: `calc(${headerControlsTokens.clearance} + ${space._2})`,
  },
  hidden: {
    display: "none",
  },
});
