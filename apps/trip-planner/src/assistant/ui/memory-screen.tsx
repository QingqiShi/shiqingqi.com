"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { Textarea } from "@tuja/ui/components/textarea";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  assistantApi,
  MAX_MEMORY_FILE_CHARS,
  type MemoryFile,
  type MemoryScopeName,
} from "#src/assistant/assistant-api.ts";
import { AssistantText } from "./assistant-text.tsx";
import { LoadState, useLoad } from "./load-state.tsx";

function memoryName(path: string) {
  return path.replace(/\.md$/, "").replaceAll(/[-_]/g, " ");
}

function MemoryEntry({
  tripId,
  scope,
  file,
  onChanged,
}: {
  tripId: string;
  scope: MemoryScopeName;
  file: MemoryFile;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"read" | "edit" | "delete">("read");
  const [draft, setDraft] = useState(file.content);
  const [isSaving, setIsSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const name = memoryName(file.path);

  useEffect(() => {
    if (mode === "edit") fieldRef.current?.focus();
  }, [mode]);

  const run = async (request: () => Promise<unknown>) => {
    setIsSaving(true);
    setFailed(false);
    try {
      await request();
      setMode("read");
      onChanged();
    } catch {
      setFailed(true);
    }
    setIsSaving(false);
  };

  const cancel = (
    <Button
      size="sm"
      look="ghost"
      disabled={isSaving}
      onClick={() => {
        setMode("read");
      }}
    >
      {t({ en: "Cancel", zh: "取消" })}
    </Button>
  );

  return (
    <Card padding="sm" css={stack.tight}>
      <div css={[row.tight, styles.entryHead]}>
        <Text as="span" look="label" verbatim css={styles.entryName}>
          {name}
        </Text>
        {mode === "read" ? (
          <div css={row.tight}>
            <Button
              size="xs"
              look="ghost"
              aria-label={t({ en: "Change {name}", zh: "修改 {name}" }).replace(
                "{name}",
                name,
              )}
              onClick={() => {
                setDraft(file.content);
                setFailed(false);
                setMode("edit");
              }}
            >
              {t({ en: "Change", zh: "修改" })}
            </Button>
            <Button
              size="xs"
              look="ghost"
              intent="destructive"
              aria-label={t({ en: "Delete {name}", zh: "删除 {name}" }).replace(
                "{name}",
                name,
              )}
              onClick={() => {
                setFailed(false);
                setMode("delete");
              }}
            >
              {t({ en: "Delete", zh: "删除" })}
            </Button>
          </div>
        ) : null}
      </div>
      {mode === "edit" ? (
        <form
          css={stack.tight}
          onSubmit={(event) => {
            event.preventDefault();
            const content = draft.trim();
            if (content === "") return;
            void run(() =>
              assistantApi.writeMemory({
                tripId,
                scope,
                path: file.path,
                content,
              }),
            );
          }}
        >
          <Textarea
            ref={fieldRef}
            label={name}
            labelHidden
            size="sm"
            autoGrow
            value={draft}
            maxLength={MAX_MEMORY_FILE_CHARS}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
          />
          <div css={[cluster.tight, styles.actions]}>
            {cancel}
            <Button
              type="submit"
              size="sm"
              look="primary"
              loading={isSaving}
              disabled={draft.trim() === ""}
            >
              {t({ en: "Save", zh: "保存" })}
            </Button>
          </div>
        </form>
      ) : (
        <AssistantText text={file.content} />
      )}
      {mode === "delete" ? (
        <div css={[cluster.tight, styles.confirm]}>
          <Text as="p" look="bodySmall" css={styles.confirmText}>
            {t({
              en: "Delete this note?",
              zh: "删除这条记忆？",
            })}
          </Text>
          <div css={row.tight}>
            {cancel}
            <Button
              size="sm"
              look="primary"
              intent="destructive"
              loading={isSaving}
              onClick={() => {
                void run(() =>
                  assistantApi.deleteMemory({
                    tripId,
                    scope,
                    path: file.path,
                  }),
                );
              }}
            >
              {t({ en: "Delete", zh: "删除" })}
            </Button>
          </div>
        </div>
      ) : null}
      {failed ? (
        <div role="alert">
          <Text as="p" look="bodySmall" tone="destructive">
            {t({
              en: "That did not go through. Try again.",
              zh: "操作没有成功，请再试一次。",
            })}
          </Text>
        </div>
      ) : null}
    </Card>
  );
}

function MemoryGroup({
  title,
  description,
  empty,
  children,
}: {
  title: string;
  description: string;
  /** What will show in the group, while it is empty. */
  empty: string | null;
  children: ReactNode;
}) {
  return (
    <section css={stack.item}>
      <div css={stack.text}>
        <Heading level={3} look="h4">
          {title}
        </Heading>
        <Text as="p" look="bodySmall" tone="muted">
          {description}
        </Text>
      </div>
      {empty === null ? (
        children
      ) : (
        <Text as="p" look="bodySmall" tone="muted" css={styles.emptyGroup}>
          {empty}
        </Text>
      )}
    </section>
  );
}

/** The trip's memory and the person's own, to read, change and delete. */
export function MemoryScreen({ tripId }: { tripId: string }) {
  const { loaded, reload } = useLoad(() => assistantApi.memory(tripId));
  if (loaded.status !== "ok") {
    return <LoadState loaded={loaded} onRetry={reload} />;
  }
  const entries = (scope: MemoryScopeName, files: MemoryFile[]) =>
    files.map((file) => (
      <MemoryEntry
        key={`${file.path}:${file.updatedAt}`}
        tripId={tripId}
        scope={scope}
        file={file}
        onChanged={reload}
      />
    ));
  const { trip, personal } = loaded.value;
  return (
    <div css={stack.group}>
      <MemoryGroup
        title={t({ en: "This trip", zh: "这趟行程" })}
        description={t({
          en: "Plans and agreements for this trip. Every member of the trip sees these, and their assistant uses them.",
          zh: "这趟行程的安排和约定。行程的每位成员都能看到，他们的助手也会用到。",
        })}
        empty={
          trip.length === 0
            ? t({
                en: "When someone says what this trip should keep to, such as “no car this time”, the assistant keeps a note of it.",
                zh: "有人说了这趟行程要遵守的事，比如“这次不租车”，助手会把它记下来。",
              })
            : null
        }
      >
        {entries("trip", trip)}
      </MemoryGroup>
      <MemoryGroup
        title={t({ en: "About you", zh: "关于你" })}
        description={t({
          en: "Your own tastes and habits, for all your trips. Only you see these, and only your assistant uses them.",
          zh: "你自己的口味和习惯，适用于你的所有行程。只有你能看到，也只有你的助手会用到。",
        })}
        empty={
          personal.length === 0
            ? t({
                en: "When you say what you like or avoid, such as “no early flights”, the assistant keeps a note of it.",
                zh: "你说了自己喜欢或不要什么，比如“不坐早班机”，助手会把它记下来。",
              })
            : null
        }
      >
        {entries("personal", personal)}
      </MemoryGroup>
    </div>
  );
}

const styles = stylex.create({
  emptyGroup: {
    paddingBlock: space._1,
  },
  entryHead: {
    justifyContent: "space-between",
  },
  entryName: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  actions: {
    justifyContent: "flex-end",
  },
  confirm: {
    justifyContent: "space-between",
  },
  confirmText: {
    flexGrow: 1,
  },
});
