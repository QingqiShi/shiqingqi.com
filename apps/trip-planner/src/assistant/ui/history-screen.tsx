"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { assistantApi } from "#src/assistant/assistant-api.ts";
import type { AssistantScreen } from "./conversation-entries.tsx";
import { LoadState, useLoad } from "./load-state.tsx";
import { useSegmentDate } from "./use-segment-date.ts";

/** The person's conversations in this trip, the newest first, each with its summary. */
export function HistoryScreen({
  tripId,
  onScreen,
}: {
  tripId: string;
  onScreen: (screen: AssistantScreen) => void;
}) {
  const { loaded, reload } = useLoad(() => assistantApi.conversations(tripId));
  const dateOf = useSegmentDate();
  const noSummary = t({ en: "No summary yet", zh: "还没有小结" });
  const now = t({ en: "Now", zh: "当前" });
  if (loaded.status !== "ok") {
    return <LoadState loaded={loaded} onRetry={reload} />;
  }
  const { segments } = loaded.value;
  return (
    <div css={stack.item}>
      <Text as="p" look="bodySmall" tone="muted">
        {t({
          en: "Only you see your conversations. A summary of each is written when it ends, and the assistant reads the last few when a new one starts.",
          zh: "你的对话只有你自己能看到。每段对话结束时会写一段小结，新对话开始时助手会读最近几段的小结。",
        })}
      </Text>
      {segments.length === 0 ? (
        <Text as="p" tone="muted" css={styles.empty}>
          {t({
            en: "Each conversation that you have about this trip comes into this list, with what was decided in it.",
            zh: "你在这趟行程里的每段对话都会列在这里，附上当时定下的事。",
          })}
        </Text>
      ) : (
        <List form="plain">
          {segments.map((segment) => (
            <ListRow
              key={segment.id}
              wrap
              detail={segment.summary ?? noSummary}
              trailing={
                segment.endedAt === null ? (
                  <Badge size="sm" intent="neutral">
                    {now}
                  </Badge>
                ) : undefined
              }
              onClick={() => {
                onScreen(
                  segment.endedAt === null
                    ? { name: "conversation" }
                    : { name: "segment", id: segment.id },
                );
              }}
            >
              {dateOf(segment.startedAt)}
            </ListRow>
          ))}
        </List>
      )}
    </div>
  );
}

const styles = stylex.create({
  empty: {
    paddingBlock: space._3,
  },
});
