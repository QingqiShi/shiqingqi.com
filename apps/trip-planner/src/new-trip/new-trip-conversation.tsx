"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { PageHeader } from "@tuja/ui/components/page-header";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useEffect, useEffectEvent } from "react";
import { AssistantPromptField } from "#src/assistant/ui/assistant-prompt-field.tsx";
import { Conversation } from "#src/assistant/ui/conversation.tsx";
import { useTripAssistant } from "#src/assistant/ui/use-trip-assistant.ts";
import { useOpenBlankTrip } from "./new-trip-provider.tsx";

/**
 * New trip: a conversation with the assistant, which makes the trip from
 * what the person says or pastes. A blank trip is the other way.
 */
export function NewTripConversation() {
  const model = useTripAssistant(null, null);
  const openBlankTrip = useOpenBlankTrip();
  const made = model.createdTrip;

  const loadOnce = useEffectEvent(() => {
    void model.load();
  });
  useEffect(() => {
    loadOnce();
  }, []);

  return (
    <div css={[stack.group, styles.page]}>
      <PageHeader
        title={t({ en: "New trip", zh: "新建行程" })}
        description={t({
          en: "Where are you going, when, and who is coming? Or paste a plan.",
          zh: "去哪里、什么时候、和谁一起？也可以直接贴上计划。",
        })}
      />
      <div css={styles.conversation}>
        <Conversation model={model} intro={null} />
      </div>
      {made ? (
        <Text as="p" look="bodySmall" tone="muted">
          {t({
            en: "Open the trip to go on with this conversation there.",
            zh: "打开行程，就能在那里继续这段对话。",
          })}
        </Text>
      ) : (
        <div css={stack.item}>
          <AssistantPromptField
            model={model}
            label={t({
              en: "Where, when, who, or paste a plan",
              zh: "去哪里、什么时候、和谁，或贴上计划",
            })}
          />
          <div>
            <Button
              look="ghost"
              bleed="start"
              disabled={model.isRunning}
              onClick={(event) => {
                openBlankTrip(event.currentTarget);
              }}
            >
              {t({ en: "Create a blank trip", zh: "创建空白行程" })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = stylex.create({
  page: {
    minBlockSize: "100%",
  },
  conversation: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
  },
});
