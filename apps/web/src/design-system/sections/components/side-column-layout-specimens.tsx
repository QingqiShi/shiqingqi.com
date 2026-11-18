"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { PromptField } from "@tuja/ui/components/prompt-field";
import { Sheet } from "@tuja/ui/components/sheet";
import { SideColumnLayout } from "@tuja/ui/components/side-column-layout";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useState, type ReactNode } from "react";
import { Specimen } from "#src/design-system/specimen.tsx";
import { DeviceFrame } from "./device-frame.tsx";

const FRAME_BLOCK_SIZE = "28rem";

/** A frame as wide as the page, where the column fits, or as narrow as a phone. */
function AssistantFrame({ children }: { children: ReactNode }) {
  return (
    <DeviceFrame
      label={t({ en: "Width of the frame", zh: "框的宽度" })}
      sizes={[
        {
          value: "wide",
          label: t({ en: "Wide", zh: "宽" }),
          inlineSize: "100%",
          blockSize: FRAME_BLOCK_SIZE,
        },
        {
          value: "phone",
          label: t({ en: "Phone", zh: "手机" }),
          inlineSize: "24.375rem",
          blockSize: FRAME_BLOCK_SIZE,
        },
      ]}
    >
      {children}
    </DeviceFrame>
  );
}

/**
 * A trip with an assistant beside it: a column where the frame is wide, and
 * a sheet where it is as narrow as a phone.
 */
export function SideColumnLayoutDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const title = t({ en: "Assistant", zh: "助手" });
  const closeLabel = t({ en: "Close", zh: "关闭" });
  const promptLabel = t({ en: "Ask about the trip", zh: "问问这趟行程" });
  const prompt = (
    <PromptField
      label={promptLabel}
      placeholder={promptLabel}
      value={draft}
      onValueChange={setDraft}
      onSubmit={() => {
        setDraft("");
      }}
      action={
        <Button
          type="submit"
          size="sm"
          aria-label={t({ en: "Send", zh: "发送" })}
          disabled={!draft.trim()}
          icon={<ArrowUpIcon weight="bold" />}
        />
      }
    />
  );
  const conversation = (
    <div css={stack.item}>
      <Text>
        {t({
          en: "Day 2 has a free afternoon. Shall I add the tea house near the hotel?",
          zh: "第二天下午有空。要不要加上酒店附近的茶室？",
        })}
      </Text>
      <Text tone="muted">
        {t({
          en: "It opens at 14:00 and takes about an hour.",
          zh: "它 14:00 开门，大约需要一小时。",
        })}
      </Text>
    </div>
  );
  const trip = (
    <>
      <Heading level={3} look="h3">
        {t({ en: "Three days in Kyoto", zh: "京都三日" })}
      </Heading>
      <Text>
        {t({
          en: "Day 1: Fushimi Inari at dawn, then Nishiki Market. Day 2: Arashiyama and a free afternoon. Day 3: Higashiyama on foot.",
          zh: "第一天：清晨去伏见稻荷，然后逛锦市场。第二天：岚山，下午自由活动。第三天：步行东山。",
        })}
      </Text>
      <div>
        <Button
          onClick={() => {
            setIsOpen(true);
          }}
        >
          {t({ en: "Ask the assistant", zh: "问助手" })}
        </Button>
      </div>
    </>
  );
  return (
    <Specimen
      stage={AssistantFrame}
      caption={t({
        en: "open the assistant, then pick Phone",
        zh: "打开助手，再选择“手机”",
      })}
    >
      <SideColumnLayout
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        title={title}
        closeLabel={closeLabel}
        actions={
          <Button
            look="ghost"
            size="sm"
            aria-label={t({ en: "Earlier conversations", zh: "以前的对话" })}
            icon={<ClockCounterClockwiseIcon weight="bold" />}
          />
        }
        column={conversation}
        footer={prompt}
      >
        {({ isAvailable }) => (
          <div css={[stack.item, styles.page]}>
            {trip}
            {isAvailable === false ? (
              <Sheet
                isOpen={isOpen}
                onClose={() => {
                  setIsOpen(false);
                }}
                title={title}
                closeLabel={closeLabel}
              >
                <div css={stack.group}>
                  {conversation}
                  {prompt}
                </div>
              </Sheet>
            ) : null}
          </div>
        )}
      </SideColumnLayout>
    </Specimen>
  );
}

const styles = stylex.create({
  page: {
    padding: space._4,
  },
});
