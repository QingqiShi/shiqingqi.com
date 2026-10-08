import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { HeroChatInput } from "#src/movie-database/chat/hero-chat-input.tsx";

export function HeroSection() {
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
  ];

  return (
    <section css={[stack.item, pageColumn.base, styles.section]}>
      <h1 css={[typeRole.fluidH1, styles.heading]}>
        {t({
          en: "What do you want to watch?",
          zh: "你想看什么？",
        })}
      </h1>
      <div css={styles.inputWrapper}>
        <HeroChatInput
          placeholder={t({
            en: "Ask about movies and TV shows...",
            zh: "询问关于电影和电视剧的问题...",
          })}
          sendLabel={t({ en: "Send message", zh: "发送消息" })}
          suggestions={suggestions}
          suggestionsGroupLabel={t({
            en: "Suggested prompts",
            zh: "推荐提问",
          })}
        />
      </div>
    </section>
  );
}

const styles = stylex.create({
  section: {
    paddingBlockStart: { default: space._9, [breakpoints.md]: space._10 },
    paddingBlockEnd: { default: space._5, [breakpoints.md]: space._8 },
    textAlign: "center",
  },
  heading: {
    color: color.fgMuted,
    margin: 0,
  },
  inputWrapper: {
    maxInlineSize: "600px",
    marginInline: "auto",
  },
});
