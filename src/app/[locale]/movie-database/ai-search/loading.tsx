import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { color, font, space } from "#src/tokens.stylex.ts";

export default function Loading() {
  return (
    <div css={styles.container}>
      <div css={styles.content}>
        <div css={styles.iconContainer}>
          <SparkleIcon
            size={48}
            weight="fill"
            css={styles.icon}
            role="presentation"
          />
        </div>
        <p css={styles.text}>
          {t({ en: "AI is thinking...", zh: "AI 正在思考..." })}
        </p>
        <p css={styles.subtext}>
          {t({
            en: "Searching movies and TV shows for you",
            zh: "正在为你搜索电影和电视剧",
          })}
        </p>
      </div>
    </div>
  );
}

const pulse = stylex.keyframes({
  "0%": {
    opacity: 0.4,
    transform: "scale(1)",
  },
  "50%": {
    opacity: 1,
    transform: "scale(1.1)",
  },
  "100%": {
    opacity: 0.4,
    transform: "scale(1)",
  },
});

const styles = stylex.create({
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    padding: space._6,
  },

  content: {
    textAlign: "center",
    maxInlineSize: "400px",
  },

  iconContainer: {
    marginBottom: space._4,
    display: "flex",
    justifyContent: "center",
  },

  icon: {
    color: color.controlActive,
    animationName: pulse,
    animationDuration: "2s",
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in-out",
  },

  text: {
    fontSize: font.uiHeading2,
    fontWeight: font.weight_6,
    color: color.textMain,
    marginBottom: space._2,
    margin: 0,
  },

  subtext: {
    fontSize: font.uiBody,
    color: color.textMuted,
    margin: 0,
  },
});
