import { CloudCheckIcon } from "@phosphor-icons/react/dist/ssr/CloudCheck";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { GuideNote } from "#src/design-system/guide/guide-section.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

const CUSTOM_STYLES = `const styles = stylex.create({
  notice: {
    gap: rhythm.tight,
    paddingBlock: space._1,
    paddingInlineStart: space._3,
    paddingInlineEnd: space._1,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.borderSuccess,
    backgroundColor: color.bgSuccessSubtle,
  },
  icon: {
    display: "inline-flex",
    flexShrink: 0,
    fontSize: font.uiBody,
    color: color.fgSuccess,
  },
  message: {
    flexGrow: 1,
    minInlineSize: 0,
  },
});`;

function OfflineNotice() {
  return (
    <div role="status" css={[flex.row, corner.radius_3, styles.notice]}>
      <span aria-hidden css={styles.icon}>
        <CloudCheckIcon />
      </span>
      <Text as="span" look="bodySmall" css={styles.message}>
        {t({
          en: "Kyoto is saved for offline use.",
          zh: "京都行程已离线保存。",
        })}
      </Text>
      <Button size="sm" look="ghost">
        {t({ en: "Undo", zh: "撤销" })}
      </Button>
    </div>
  );
}

export function CustomizationBuiltExample() {
  return (
    <>
      <Specimen
        caption={t({
          en: "A notice built from Tokens, Primitives and Button",
          zh: "由令牌、原语与 Button 搭成的通知",
        })}
      >
        <OfflineNotice />
      </Specimen>
      <UsageSnippet
        code={CUSTOM_STYLES}
        label={t({ en: "Its styles", zh: "它的样式" })}
      />
      <GuideNote>
        {t({
          en: "Callout has no place for an action beside its message, only a dismiss button, so this notice is built. The colour Tokens keep it right in both schemes, corner gives it the same corner as Callout, and Button brings its own focus ring, keyboard handling and press. The live role, the layout and the words are now yours to get right.",
          zh: "Callout 在消息旁边没有放置操作的位置，只有一个关闭按钮，因此这条通知是自行搭建的。颜色令牌让它在两种配色下都正确，corner 让它的圆角与 Callout 一致，Button 自带焦点环、键盘处理与按压反馈。live 角色、布局与文字则改由你来保证正确。",
        })}
      </GuideNote>
    </>
  );
}

const styles = stylex.create({
  notice: {
    gap: rhythm.tight,
    paddingBlock: space._1,
    paddingInlineStart: space._3,
    paddingInlineEnd: space._1,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.borderSuccess,
    backgroundColor: color.bgSuccessSubtle,
  },
  icon: {
    display: "inline-flex",
    flexShrink: 0,
    fontSize: font.uiBody,
    color: color.fgSuccess,
  },
  message: {
    flexGrow: 1,
    minInlineSize: 0,
  },
});
