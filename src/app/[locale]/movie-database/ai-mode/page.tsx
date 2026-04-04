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

  const suggestions = [
    t({
      en: "Find me a feel-good movie to watch tonight",
      zh: "帮我找一部今晚看的治愈系电影",
    }),
    t({
      en: "Where can I stream the latest trending shows?",
      zh: "最近的热门剧在哪里可以看？",
    }),
    t({
      en: "Show me the spicy reviews for the latest releases",
      zh: "给我看看最近上映的片子的辛辣影评",
    }),
    t({
      en: "Who starred in that space movie from last year?",
      zh: "去年那部太空电影是谁演的？",
    }),
  ];

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
            suggestions={suggestions}
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
      errorLabel={t({
        en: "Something went wrong. Please try again.",
        zh: "出了点问题，请重试。",
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
