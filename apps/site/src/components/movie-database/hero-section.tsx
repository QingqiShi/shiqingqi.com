import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { t } from "#src/i18n.ts";
import { color, font, layout, space } from "#src/tokens.stylex.ts";
import { HeroChatInput } from "./hero-chat-input";

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
    <section css={styles.section}>
      <h1 css={styles.heading}>
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
    maxInlineSize: layout.maxInlineSize,
    marginInline: "auto",
    paddingBlockStart: { default: space._9, [breakpoints.md]: space._10 },
    paddingBlockEnd: { default: space._5, [breakpoints.md]: space._8 },
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
    textAlign: "center",
  },
  heading: {
    fontSize: font.vpHeading1,
    fontWeight: font.weight_7,
    color: color.textMuted,
    marginBottom: space._3,
  },
  inputWrapper: {
    maxInlineSize: "600px",
    marginInline: "auto",
  },
});
