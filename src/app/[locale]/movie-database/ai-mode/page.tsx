import * as stylex from "@stylexjs/stylex";
import { RecommendedMedia } from "#src/components/ai-chat/recommended-media.tsx";
import { SuggestionChips } from "#src/components/ai-chat/suggestion-chips.tsx";
import { t } from "#src/i18n.ts";
import { space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { AIChatView } from "./ai-chat-view";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);

  return (
    <AIChatView
      locale={validatedLocale}
      emptyState={
        <div css={styles.welcomeContainer}>
          <SuggestionChips
            groupLabel={t({
              en: "Suggested prompts",
              zh: "推荐提问",
            })}
            suggestions={[
              t({
                en: "What should I watch tonight?",
                zh: "今晚该看什么？",
              }),
              t({
                en: "Find me a sci-fi thriller",
                zh: "找一部科幻惊悚片",
              }),
              t({
                en: "Best movies of 2025",
                zh: "2025年最佳电影",
              }),
              t({
                en: "Shows similar to Breaking Bad",
                zh: "类似《绝命毒师》的剧",
              }),
            ]}
          />
          <RecommendedMedia locale={validatedLocale} />
        </div>
      }
      messagesLabel={t({
        en: "Chat messages",
        zh: "聊天消息",
      })}
      typingIndicatorLabel={t({
        en: "AI is thinking…",
        zh: "AI 正在思考…",
      })}
      scrollToBottomLabel={t({
        en: "Scroll to bottom",
        zh: "滚动到底部",
      })}
      placeholder={t({
        en: "Ask about movies and TV shows...",
        zh: "询问关于电影和电视剧的问题...",
      })}
      sendLabel={t({ en: "Send message", zh: "发送消息" })}
      stopLabel={t({ en: "Stop generating", zh: "停止生成" })}
      removeAttachmentLabel={t({ en: "Remove attachment", zh: "移除附件" })}
    />
  );
}

const styles = stylex.create({
  welcomeContainer: {
    display: "flex",
    flexDirection: "column",
    gap: space._5,
    width: "100%",
  },
});
