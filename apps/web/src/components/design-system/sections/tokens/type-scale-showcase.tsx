import * as stylex from "@stylexjs/stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { Showcase } from "../../showcase.tsx";
import { TypeSample } from "../../type-sample.tsx";

export function TypeScaleShowcase() {
  return (
    <Showcase label={t({ en: "Type scale", zh: "字号" })}>
      <div css={[flex.col, styles.stack]}>
        <TypeSample
          label="font.uiDisplay"
          meta="3rem"
          sizeStyle={styles.display}
        >
          {t({ en: "Display", zh: "展示" })}
        </TypeSample>
        <TypeSample
          label="font.uiHeading0"
          meta="2rem"
          sizeStyle={styles.heading0}
        >
          {t({ en: "Heading 0", zh: "标题 0" })}
        </TypeSample>
        <TypeSample
          label="font.uiHeading1"
          meta="1.5rem"
          sizeStyle={styles.heading1}
        >
          {t({ en: "Heading 1", zh: "标题 1" })}
        </TypeSample>
        <TypeSample
          label="font.uiHeading2"
          meta="1.25rem"
          sizeStyle={styles.heading2}
        >
          {t({ en: "Heading 2", zh: "标题 2" })}
        </TypeSample>
        <TypeSample
          label="font.uiHeading3"
          meta="1.1rem"
          sizeStyle={styles.heading3}
        >
          {t({ en: "Heading 3", zh: "标题 3" })}
        </TypeSample>
        <TypeSample label="font.uiBody" meta="1rem" sizeStyle={styles.body}>
          {t({
            en: "The quick brown fox jumps over the lazy dog.",
            zh: "敏捷的棕色狐狸跃过懒惰的狗。",
          })}
        </TypeSample>
        <TypeSample
          label="font.uiBodySmall"
          meta="0.85rem"
          sizeStyle={styles.bodySmall}
        >
          {t({
            en: "The quick brown fox jumps over the lazy dog.",
            zh: "敏捷的棕色狐狸跃过懒惰的狗。",
          })}
        </TypeSample>
        <TypeSample
          label="font.uiCaption"
          meta="0.75rem"
          sizeStyle={styles.caption}
        >
          {t({ en: "Caption text", zh: "说明文字" })}
        </TypeSample>
        <TypeSample
          label="font.uiOverline"
          meta="0.7rem"
          sizeStyle={styles.overline}
        >
          {t({ en: "Overline label", zh: "上线标签" })}
        </TypeSample>
      </div>
    </Showcase>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._4,
  },
  display: { fontSize: font.uiDisplay, fontWeight: font.weight_8 },
  heading0: { fontSize: font.uiHeading0, fontWeight: font.weight_8 },
  heading1: { fontSize: font.uiHeading1, fontWeight: font.weight_7 },
  heading2: { fontSize: font.uiHeading2, fontWeight: font.weight_7 },
  heading3: { fontSize: font.uiHeading3, fontWeight: font.weight_6 },
  body: { fontSize: font.uiBody, fontWeight: font.weight_4 },
  bodySmall: { fontSize: font.uiBodySmall, fontWeight: font.weight_4 },
  caption: { fontSize: font.uiCaption, fontWeight: font.weight_5 },
  overline: {
    fontSize: font.uiOverline,
    fontWeight: font.weight_6,
    textTransform: "uppercase",
    letterSpacing: font.trackingWidest,
  },
});
