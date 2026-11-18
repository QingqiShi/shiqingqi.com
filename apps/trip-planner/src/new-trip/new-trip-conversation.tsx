"use client";

import { ChatTextIcon } from "@phosphor-icons/react/dist/ssr/ChatText";
import { ClipboardTextIcon } from "@phosphor-icons/react/dist/ssr/ClipboardText";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { ReceiptIcon } from "@phosphor-icons/react/dist/ssr/Receipt";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { OptionCard } from "@tuja/ui/components/option-card";
import {
  StickyControlGroup,
  StickyControls,
} from "@tuja/ui/components/sticky-controls";
import { Text } from "@tuja/ui/components/text";
import {
  captureLayout,
  playLayout,
  type LayoutSnapshot,
} from "@tuja/ui/motion/play-layout";
import { useMotionEngine } from "@tuja/ui/motion/use-motion-engine";
import { show } from "@tuja/ui/primitives/show.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { tabViewWidth } from "@tuja/ui/primitives/view-width.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import {
  AssistantPromptField,
  type TextControl,
} from "#src/assistant/ui/assistant-prompt-field.tsx";
import { Conversation } from "#src/assistant/ui/conversation.tsx";
import { promptDock } from "#src/assistant/ui/prompt-dock.stylex.ts";
import { useTripAssistant } from "#src/assistant/ui/use-trip-assistant.ts";
import { useOpenBlankTrip } from "./new-trip-provider.tsx";

/**
 * New trip: a conversation with the assistant, which makes the trip from
 * what the person says, pastes or adds. A blank trip is the other way.
 * Before the first message, the prompt sits under a question, and from the
 * first message it docks at the bottom of the page.
 */
export function NewTripConversation() {
  const model = useTripAssistant(null, null);
  const openBlankTrip = useOpenBlankTrip();
  const made = model.createdTrip;
  const fieldRef = useRef<TextControl>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const beforeSendRef = useRef<LayoutSnapshot | null>(null);
  const engine = useMotionEngine();

  const loadOnce = useEffectEvent(() => {
    void model.load();
  });
  useEffect(() => {
    loadOnce();
  }, []);

  // Until the conversation loads, it is not known which layout the page has,
  // so the conversation shows its spinner alone.
  const isLoading =
    !model.isLoaded && !model.loadFailed && model.transcript.length === 0;
  const isStart =
    model.isLoaded && model.transcript.length === 0 && made === null;

  // The first message moves the prompt from under the question to the dock.
  const capture = () => {
    const page = pageRef.current;
    const prompt = promptRef.current;
    if (isStart && page && prompt) {
      beforeSendRef.current = captureLayout([prompt], page);
    }
  };
  useLayoutEffect(() => {
    const snapshot = beforeSendRef.current;
    const prompt = promptRef.current;
    if (isStart || !snapshot || !prompt) return;
    beforeSendRef.current = null;
    playLayout(engine, snapshot, [prompt]);
  }, [isStart, engine]);

  const examples = [
    t({
      en: "Kyoto with family, 6 days",
      zh: "五一和爸妈去京都 6 天",
    }),
    t({
      en: "Road trip in Iceland next month",
      zh: "下个月一个人去冰岛自驾",
    }),
    t({
      en: "Weekend in Hangzhou with two kids",
      zh: "周末带两个孩子去杭州",
    }),
  ];
  const fill = (text: string) => {
    model.setDraft(text);
    fieldRef.current?.focus();
  };

  return (
    <div
      ref={pageRef}
      css={[styles.page, isStart ? styles.start : stack.group]}
    >
      {isStart ? (
        <Heading level={1} look="h1" align="center" css={styles.question}>
          {t({ en: "Where to next?", zh: "这次去哪里？" })}
        </Heading>
      ) : (
        <div css={styles.conversation}>
          <Conversation model={model} intro={null} />
        </div>
      )}
      {isLoading ? null : made ? (
        <Text as="p" look="bodySmall" tone="muted">
          {t({
            en: "Open the trip to go on with this conversation there.",
            zh: "打开行程，就能在那里继续这段对话。",
          })}
        </Text>
      ) : (
        <StickyControls
          css={[promptDock.dock, isStart && styles.promptAtStart]}
        >
          <StickyControlGroup css={styles.fill}>
            <div ref={promptRef} css={styles.fill}>
              <AssistantPromptField
                model={model}
                fieldRef={fieldRef}
                filePickerRef={filePickerRef}
                onBeforeSend={capture}
                label={t({
                  en: "Where, when, who, or paste a plan",
                  zh: "去哪里、什么时候、和谁，或贴上计划",
                })}
                placeholder={t({
                  en: "Where, when and who. Or paste a plan, or add a booking",
                  zh: "去哪里、什么时候、和谁；也可以贴上计划或添加订单",
                })}
                stacked
              />
            </div>
          </StickyControlGroup>
        </StickyControls>
      )}
      {isStart ? (
        <div css={styles.ways}>
          <div css={show.wide}>
            <div css={stack.item}>
              <div css={styles.cards}>
                <OptionCard
                  look="tile"
                  indicator={null}
                  icon={<ChatTextIcon weight="bold" />}
                  label={t({ en: "Say it in a line", zh: "说一句话" })}
                  description={examples[0]}
                  css={styles.card}
                  onClick={() => {
                    fill(examples[0] ?? "");
                  }}
                />
                <OptionCard
                  look="tile"
                  indicator={null}
                  icon={<ClipboardTextIcon weight="bold" />}
                  label={t({ en: "Paste a plan", zh: "贴上计划" })}
                  description={t({
                    en: "From notes, chats or docs",
                    zh: "笔记、聊天或文档里的行程",
                  })}
                  css={styles.card}
                  onClick={() => {
                    fieldRef.current?.focus();
                  }}
                />
                <OptionCard
                  look="tile"
                  indicator={null}
                  icon={<ReceiptIcon weight="bold" />}
                  label={t({ en: "Add a booking", zh: "添加订单" })}
                  description={t({
                    en: "Screenshots or PDFs",
                    zh: "机票、酒店的截图或 PDF",
                  })}
                  css={styles.card}
                  onClick={() => {
                    filePickerRef.current?.click();
                  }}
                />
              </div>
              <div css={[cluster.item, styles.centred]}>
                <Button
                  look="ghost"
                  size="sm"
                  disabled={model.isRunning}
                  onClick={(event) => {
                    openBlankTrip(event.currentTarget);
                  }}
                >
                  {t({
                    en: "Or create a blank trip",
                    zh: "或者，创建空白行程",
                  })}
                </Button>
              </div>
            </div>
          </div>
          <div css={show.narrow}>
            <div css={[cluster.item, styles.centred]}>
              {examples.map((example) => (
                <Button
                  key={example}
                  size="sm"
                  look="outline"
                  onClick={() => {
                    fill(example);
                  }}
                >
                  {example}
                </Button>
              ))}
              <Button
                size="sm"
                look="outline"
                icon={<PlusIcon weight="bold" />}
                disabled={model.isRunning}
                onClick={(event) => {
                  openBlankTrip(event.currentTarget);
                }}
              >
                {t({ en: "Blank trip", zh: "空白行程" })}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const COLUMN = "44rem";

const styles = stylex.create({
  page: {
    flexGrow: 1,
    inlineSize: "100%",
    maxInlineSize: COLUMN,
    marginInline: "auto",
  },
  start: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gridTemplateAreas: {
      default: '"." "question" "ways" "." "prompt"',
      [tabViewWidth.fromRail]: '"." "question" "prompt" "ways" "."',
    },
    gridTemplateRows: {
      default: "1fr auto auto 1fr auto",
      [tabViewWidth.fromRail]: "1fr auto auto auto 1.4fr",
    },
    rowGap: rhythm.group,
  },
  question: {
    gridArea: "question",
  },
  conversation: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
  },
  promptAtStart: {
    gridArea: "prompt",
    marginBlockStart: 0,
  },
  fill: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  ways: {
    gridArea: "ways",
  },
  centred: {
    justifyContent: "center",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: rhythm.item,
  },
  card: {
    alignItems: "start",
    textAlign: "start",
  },
});
