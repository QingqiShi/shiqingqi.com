"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { assistantApi } from "#src/assistant/assistant-api.ts";
import { useSegmentFailureWords } from "./conversation-entries.tsx";
import { ReadOnlyConversation } from "./conversation.tsx";
import { LoadState, useLoad } from "./load-state.tsx";
import type { TripAssistantModel } from "./use-trip-assistant.ts";

/** An earlier conversation as it reads. */
export function SegmentScreen({ id }: { id: string }) {
  const { loaded, reload } = useLoad(() => assistantApi.conversation(id));
  if (loaded.status !== "ok") {
    return <LoadState loaded={loaded} onRetry={reload} />;
  }
  const { segment, transcript } = loaded.value;
  return (
    <div css={stack.item}>
      {segment.summary ? (
        <Card padding="sm" css={stack.text}>
          <Text as="p" look="caption" tone="muted">
            {t({ en: "Summary", zh: "小结" })}
          </Text>
          <Text as="p" look="bodySmall" verbatim>
            {segment.summary}
          </Text>
        </Card>
      ) : null}
      <ReadOnlyConversation items={transcript} startedAt={segment.startedAt} />
    </div>
  );
}

/** Takes an earlier conversation up again, in place of the prompt. */
export function ContinueBar({
  id,
  model,
  onContinued,
}: {
  id: string;
  model: TripAssistantModel;
  onContinued: () => void;
}) {
  const failureWords = useSegmentFailureWords();
  return (
    <div css={stack.tight}>
      {model.segmentFailure ? (
        <div role="alert">
          <Text as="p" look="bodySmall" tone="destructive">
            {failureWords[model.segmentFailure]}
          </Text>
        </div>
      ) : (
        <Text as="p" look="caption" tone="muted">
          {t({
            en: "Going on with it ends the conversation you are in now, and writes its summary.",
            zh: "接着这段聊，会结束你现在的对话，并为它写好小结。",
          })}
        </Text>
      )}
      <div>
        <Button
          size="sm"
          look="primary"
          disabled={model.isRunning || model.switching !== null}
          loading={model.switching === id}
          onClick={() => {
            void model.reopen(id).then((done) => {
              if (done) onContinued();
            });
          }}
        >
          {t({ en: "Continue this conversation", zh: "接着这段对话聊" })}
        </Button>
      </div>
    </div>
  );
}
