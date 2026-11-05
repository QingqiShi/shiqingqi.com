"use client";

import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { Popover } from "@tuja/ui/components/popover";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { Textarea } from "@tuja/ui/components/textarea";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlHeight, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { mergeRefs } from "@tuja/ui/utils/merge-refs";
import {
  useId,
  useRef,
  useState,
  type CompositionEvent,
  type KeyboardEvent,
} from "react";
import type { ChecklistItem } from "../report/own-todo.ts";
import { spanOfMove } from "../report/rearrange.ts";
import { todoLimits } from "../report/todo-limits.ts";
import { checklistProgress } from "./checklist-progress.tsx";
import {
  SortableRows,
  useMoveStatus,
  useSortableRow,
} from "./sortable-rows.tsx";
import { TickBox } from "./tick-box.tsx";
import {
  MenuAction,
  useFocusAfterMove,
  type TodoMoves,
} from "./todo-row-menu.tsx";
import { useTodoStore } from "./todo-store-provider.tsx";

function oneLine(text: string) {
  return text.replaceAll(/\s*\n\s*/g, " ").trim();
}

const IME_ENTER_MS = 50;

/**
 * Reads the Enter key in a field where the owner can type Chinese. Safari ends a
 * composition before the keydown of the Enter that confirms it, so `isComposing`
 * is false. Thus an Enter directly after the end of a composition does not count.
 */
function useEnterOutsideIme(onEnter: () => void) {
  const compositionEndRef = useRef(Number.NEGATIVE_INFINITY);
  return {
    onCompositionEnd: (event: CompositionEvent<HTMLElement>) => {
      compositionEndRef.current = event.timeStamp;
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (
        event.key === "Enter" &&
        !event.nativeEvent.isComposing &&
        event.timeStamp - compositionEndRef.current > IME_ENTER_MS
      ) {
        event.preventDefault();
        onEnter();
      }
    },
  };
}

function StepMenu({
  step,
  moves,
  onDelete,
}: {
  step: ChecklistItem;
  moves: TodoMoves;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { triggerRef, noteMove } = useFocusAfterMove(open);
  const closeThen = (action: () => void) => () => {
    setOpen(false);
    action();
  };
  const up = noteMove(moves.up);
  const down = noteMove(moves.down);
  const moreActions = t({
    en: "More actions: {step}",
    zh: "更多操作：{step}",
  }).replace("{step}", step.text);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement="bottom-end"
      aria-label={t({ en: "Step actions", zh: "步骤操作" })}
      trigger={(triggerProps) => (
        <Button
          {...triggerProps}
          ref={mergeRefs(triggerProps.ref, triggerRef)}
          type="button"
          size="sm"
          look="ghost"
          icon={<DotsThreeIcon weight="bold" />}
          aria-label={moreActions}
        />
      )}
    >
      <div css={[stack.rows, styles.menu]}>
        {up ? (
          <MenuAction onClick={closeThen(up)}>
            {t({ en: "Move up", zh: "上移" })}
          </MenuAction>
        ) : null}
        {down ? (
          <MenuAction onClick={closeThen(down)}>
            {t({ en: "Move down", zh: "下移" })}
          </MenuAction>
        ) : null}
        <MenuAction danger onClick={closeThen(onDelete)}>
          {t({ en: "Delete", zh: "删除" })}
        </MenuAction>
      </div>
    </Popover>
  );
}

function StepRow({
  todoId,
  step,
  place,
  draggable,
  takeFocus,
  moves,
}: {
  todoId: string;
  step: ChecklistItem;
  place: number;
  draggable: boolean;
  takeFocus: boolean;
  moves: TodoMoves;
}) {
  const { changeStep, removeStep } = useTodoStore();
  const { itemRef, itemCss, handle } = useSortableRow(step.id, draggable);
  const [seenText, setSeenText] = useState(step.text);
  const [draft, setDraft] = useState(step.text);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // A change that the server refused takes the text back, and the field follows.
  if (seenText !== step.text) {
    setSeenText(step.text);
    setDraft(step.text);
  }

  function saveText() {
    const text = oneLine(draft);
    if (text && text !== step.text) {
      changeStep(todoId, step.id, { text });
    } else {
      setDraft(step.text);
    }
  }

  const enterKeys = useEnterOutsideIme(() => {
    textRef.current?.blur();
  });

  return (
    <li ref={itemRef} css={[cluster.tight, styles.step, itemCss]}>
      <div css={styles.firstLine}>
        <TickBox
          label={step.text}
          checked={step.done}
          autoFocus={takeFocus}
          onChange={(done) => {
            changeStep(todoId, step.id, { done });
          }}
        />
      </div>
      <div css={styles.stepText}>
        <Textarea
          label={t({ en: "Step {place}", zh: "第 {place} 步" }).replace(
            "{place}",
            String(place),
          )}
          labelHidden
          ref={textRef}
          size="sm"
          rows={1}
          autoGrow
          value={draft}
          maxLength={todoLimits.checklistItemChars}
          css={[styles.stepField, step.done && styles.stepDone]}
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onBlur={saveText}
          {...enterKeys}
        />
      </div>
      {handle}
      <StepMenu
        step={step}
        moves={moves}
        onDelete={() => {
          removeStep(todoId, step.id);
        }}
      />
    </li>
  );
}

/**
 * The steps of a to-do, in its editor. Each change of a step saves at once, as a
 * tick must. Only the text in the box for a new step waits for Save.
 */
export function TodoChecklist({
  todoId,
  steps,
  takeFocus,
  newStep,
  onNewStepChange,
}: {
  todoId: string;
  steps: readonly ChecklistItem[];
  /** The editor opened on the checklist. */
  takeFocus: boolean;
  newStep: string;
  onNewStepChange: (text: string) => void;
}) {
  const { addStep, reorderSteps } = useTodoStore();
  const [status, noteMoved] = useMoveStatus();
  const headingId = useId();
  const ids = steps.map((step) => step.id);
  const firstOpen = steps.find((step) => !step.done)?.id;
  const addLabel = t({ en: "Add a step", zh: "添加一步" });

  const move = (from: number, to: number) => {
    reorderSteps(todoId, spanOfMove(ids, from, to));
    noteMoved(steps[from].text, to + 1, ids.length);
  };

  function addNewStep() {
    const text = newStep.trim();
    if (!text) return;
    addStep(todoId, text);
    onNewStepChange("");
  }

  const enterKeys = useEnterOutsideIme(addNewStep);

  return (
    <div role="group" aria-labelledby={headingId} css={stack.tight}>
      <div css={[cluster.tight, styles.heading]}>
        <span id={headingId} css={[typeRole.control, styles.title]}>
          {t({ en: "Checklist", zh: "清单" })}
        </span>
        <Text look="caption" tone="muted">
          {checklistProgress(steps)}
        </Text>
      </div>
      {steps.length > 0 ? (
        <SortableRows ids={ids} onMove={move}>
          <ul css={styles.steps}>
            {steps.map((step, index) => (
              <StepRow
                key={step.id}
                todoId={todoId}
                step={step}
                place={index + 1}
                draggable={ids.length > 1}
                takeFocus={takeFocus && step.id === firstOpen}
                moves={{
                  up:
                    index > 0
                      ? () => {
                          move(index, index - 1);
                        }
                      : null,
                  down:
                    index < ids.length - 1
                      ? () => {
                          move(index, index + 1);
                        }
                      : null,
                }}
              />
            ))}
          </ul>
        </SortableRows>
      ) : null}
      <div css={[cluster.tight, styles.add]}>
        <div css={styles.stepText}>
          <TextField
            label={addLabel}
            labelHidden
            placeholder={addLabel}
            size="sm"
            value={newStep}
            maxLength={todoLimits.checklistItemChars}
            autoFocus={takeFocus && firstOpen === undefined}
            onChange={(event) => {
              onNewStepChange(event.target.value);
            }}
            {...enterKeys}
          />
        </div>
        <Button
          type="button"
          size="sm"
          look="ghost"
          icon={<PlusIcon weight="bold" />}
          aria-label={addLabel}
          disabled={!newStep.trim()}
          onClick={addNewStep}
        />
      </div>
      <div role="status" css={a11y.srOnly}>
        {status}
      </div>
    </div>
  );
}

const styles = stylex.create({
  menu: {
    minInlineSize: "10rem",
  },
  heading: {
    alignItems: "baseline",
  },
  title: {
    fontWeight: font.weight_6,
    color: color.fg,
  },
  steps: {
    listStyleType: "none",
    margin: 0,
    padding: 0,
  },
  step: {
    flexWrap: "nowrap",
    alignItems: "flex-start",
    gap: rhythm.inline,
  },
  firstLine: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    minBlockSize: controlHeight.sm,
  },
  stepText: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  stepField: {
    borderColor: { default: "transparent", ":focus": color.borderAccent },
    backgroundColor: "transparent",
    paddingInline: space._1,
  },
  stepDone: {
    color: color.fgMuted,
    textDecorationLine: "line-through",
  },
  add: {
    flexWrap: "nowrap",
    alignItems: "center",
  },
});
