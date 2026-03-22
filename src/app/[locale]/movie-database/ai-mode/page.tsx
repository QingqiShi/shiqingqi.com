import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";
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
          <h1 css={styles.welcomeTitle}>
            {t({ en: "AI Mode", zh: "AI 模式" })}
          </h1>
          <p css={styles.welcomeDescription}>
            {t({
              en: "Chat with AI about movies and TV shows",
              zh: "与 AI 聊电影和电视剧",
            })}
          </p>
        </div>
      }
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
    />
  );
}

const styles = stylex.create({
  welcomeContainer: {
    textAlign: "center",
  },
  welcomeTitle: {
    fontSize: font.uiHeading1,
    fontWeight: font.weight_6,
    color: color.textMain,
    margin: 0,
    marginBottom: space._2,
  },
  welcomeDescription: {
    fontSize: font.uiBody,
    color: color.textMuted,
    margin: 0,
  },
});
