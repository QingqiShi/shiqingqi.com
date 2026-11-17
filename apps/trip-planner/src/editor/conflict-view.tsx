"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Columns } from "@tuja/ui/components/columns";
import { Text } from "@tuja/ui/components/text";
import { useToast } from "@tuja/ui/components/toast-provider";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import {
  applyOps,
  withExpect,
  type DraftOp,
} from "#src/trips/ops/apply-ops.ts";
import { useEditor } from "./editor-provider.tsx";
import { goesWithTheirs } from "./goes-with-theirs.ts";
import { SheetActions } from "./sheet-actions.tsx";
import { useDescribe } from "./use-describe.ts";

function addedId(op: DraftOp): string | null {
  if (op.op === "addDay") return op.id;
  if (op.op === "addMoment") return op.moment.id;
  if (op.op === "addItem") return op.item.id;
  return null;
}

function Version({ title, lines }: { title: string; lines: string[] | null }) {
  return (
    <Card>
      <div css={stack.tight}>
        <Text look="label" weight="semibold">
          {title}
        </Text>
        {lines ? (
          lines.map((line, index) => (
            <Text key={index} as="p" look="bodySmall">
              {line}
            </Text>
          ))
        ) : (
          <Text as="p" look="bodySmall" tone="muted">
            {t({ en: "It is not in the trip.", zh: "行程里已没有它。" })}
          </Text>
        )}
      </div>
    </Card>
  );
}

/**
 * The two versions of a thing that the person and someone else changed at
 * the same time, and the choice between them. It does not say who the other
 * person is.
 */
export function ConflictView({ onDone }: { onDone: () => void }) {
  const { state, queue } = useEditor();
  const describe = useDescribe();
  // The sheet keeps its content while it leaves, after the conflict has ended.
  const [conflict] = useState(() => {
    const { problem } = state;
    if (problem?.kind !== "conflict") return null;
    const { batch } = problem;
    // "Use mine" puts the person's change on the other version, so the
    // sheet shows that as the person's version.
    const merged = applyOps(
      problem.theirs,
      withExpect(problem.theirs, batch.ops),
    );
    // The later changes of the person that go with this one.
    const later = goesWithTheirs(problem.theirs, state.pending).filter(
      (each) => each.id !== batch.id,
    );
    return {
      problem,
      mine: merged.status === "applied" ? merged.trip : state.trip,
      // A thing that the change adds has no other version.
      ids: batch.touches.filter(
        (id) => !batch.ops.some((op) => addedId(op) === id),
      ),
      hasLater: later.length > 0,
      hasOther: later.some((each) =>
        each.touches.some((id) => !batch.touches.includes(id)),
      ),
      // The person's version takes the thing out, with all that someone
      // else put in it.
      removes: batch.ops.some(
        (op) =>
          op.op === "removeDay" ||
          op.op === "removeMoment" ||
          op.op === "removeItem",
      ),
    };
  });
  const showToast = useToast();
  const theirsKept = t({ en: "Their version is kept", zh: "已保留对方的版本" });
  const notSaved = t({
    en: "Your change was not saved",
    zh: "你的修改没有保存",
  });
  const theirVersion = t({ en: "Their version", zh: "对方的版本" });
  const yourVersion = t({ en: "Your version", zh: "你的版本" });
  if (!conflict) return null;
  const { problem, mine, ids, hasLater, hasOther, removes } = conflict;
  const later = !hasLater
    ? null
    : problem.canKeepMine
      ? hasOther
        ? t({
            en: "You made more changes after that, and some of them also changed other things. If you keep their version, all of those changes go too.",
            zh: "之后你还做了其他修改，其中有些同时改了别处。如果保留对方的版本，这些修改都会一并放弃。",
          })
        : t({
            en: "You changed this again after that. If you keep their version, those changes go too.",
            zh: "之后你又改过这里。如果保留对方的版本，这些修改也会一并放弃。",
          })
      : hasOther
        ? t({
            en: "Some changes that you made after that also changed other things. They cannot be saved either.",
            zh: "之后你做的一些修改同时改了别处，它们也无法保存。",
          })
        : null;

  return (
    <div css={stack.item}>
      <Text as="p" tone="muted">
        {problem.canKeepMine
          ? t({
              en: "Someone else changed this while you did. Choose the version to keep.",
              zh: "在你修改的同时，其他人也改了这里。请选择保留哪个版本。",
            })
          : t({
              en: "Someone else removed this while you changed it, so your change cannot be saved.",
              zh: "在你修改的同时，其他人移除了它，所以你的修改无法保存。",
            })}
      </Text>
      {later ? (
        <Text as="p" tone="muted">
          {later}
        </Text>
      ) : null}
      {ids.map((id) => (
        <Columns key={id} gap="item">
          <Version title={theirVersion} lines={describe(problem.theirs, id)} />
          <Version title={yourVersion} lines={describe(mine, id)} />
        </Columns>
      ))}
      <SheetActions>
        <Button
          look={problem.canKeepMine && !removes ? "outline" : "primary"}
          onClick={() => {
            queue.keepTheirs();
            // This takes the place of the toast that offers to undo the
            // change. A change to a different thing that goes too has its
            // own toast, which stays.
            if (!hasOther) {
              showToast({
                message: problem.canKeepMine ? theirsKept : notSaved,
              });
            }
            onDone();
          }}
        >
          {problem.canKeepMine
            ? t({ en: "Keep theirs", zh: "保留对方的" })
            : t({ en: "OK", zh: "好" })}
        </Button>
        {problem.canKeepMine ? (
          <Button
            look={removes ? "outline" : "primary"}
            onClick={() => {
              queue.keepMine();
              onDone();
            }}
          >
            {t({ en: "Use mine", zh: "用我的" })}
          </Button>
        ) : null}
      </SheetActions>
    </div>
  );
}
