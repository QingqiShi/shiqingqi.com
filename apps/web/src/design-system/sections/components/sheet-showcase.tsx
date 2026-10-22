import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { DoDont } from "#src/design-system/do-dont.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { SheetSpecimen } from "#src/design-system/specimens/sheet-specimen.tsx";
import { t } from "#src/i18n.ts";
import { ShortSheetDemo, TallSheetDemo } from "./sheet-specimens.tsx";

export function SheetShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Live", zh: "实时演示" })} leadsWithText>
        <div css={stack.item}>
          <ShowcaseHelper>
            {t({
              en: "On a phone the card floats at the bottom of the screen, inset from the edges, and fits its content. It slides up from below the screen, and slides back down to leave. On a tablet or a desktop it sits in the centre, and rises a little, grows and fades in. Content taller than the screen scrolls inside the card. The page behind is dimmed, and its scroll is locked.",
              zh: "在手机上，卡片浮在屏幕底部，与边缘留有间距，高度随内容而定；它从屏幕下方滑上来，离开时滑回下方。在平板和桌面上，它居中显示，打开时轻轻上升、略微放大并淡入。高于屏幕的内容在卡片内滚动。背后的页面被压暗，滚动被锁定。",
            })}
          </ShowcaseHelper>
          <SpecimenGrid>
            <Specimen caption={t({ en: "short content", zh: "短内容" })}>
              <ShortSheetDemo />
            </Specimen>
            <Specimen caption={t({ en: "tall content", zh: "长内容" })}>
              <TallSheetDemo />
            </Specimen>
          </SpecimenGrid>
        </div>
      </Showcase>

      <Showcase
        label={t({ en: "Drag to dismiss", zh: "拖动关闭" })}
        leadsWithText
      >
        <div css={stack.item}>
          <ShowcaseHelper>
            {t({
              en: "On a phone, a drag down on the grabber moves the card with the pointer. A touch on the content does the same while the content is scrolled to its top. The card stays opaque under the pointer, past the bottom edge of the screen too, and the dimming fades with the distance. Let go past 30% of the card's height (160px at most), or with a flick down, and it slides off the screen; otherwise it springs back. A drag up resists. On a tablet or a desktop the card is in the centre, so it has no grabber, and only Escape, a click on the dimmed page and the close button close it.",
              zh: "在手机上，按住拖动条向下拖，卡片会跟随指针移动；当内容已滚动到顶部时，在内容上触摸拖动也一样。卡片在指针下始终不透明，越过屏幕底边后也是如此，压暗随距离逐渐减弱。松手时若超过卡片高度的 30%（最多 160px），或快速向下一甩，卡片会滑出屏幕；否则弹回原位。向上拖会遇到阻力。在平板和桌面上卡片居中，没有拖动条，只能用 Escape、点击压暗的页面或关闭按钮关闭。",
            })}
          </ShowcaseHelper>
          <Specimen caption={t({ en: "on a phone", zh: "手机上" })}>
            <div css={styles.diagram}>
              <SheetSpecimen />
            </div>
          </Specimen>
        </div>
      </Showcase>

      <PropsTable component="sheet" />

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <div css={[corner.radius_3, styles.dialogSample]}>
              <span css={[typeRole.body, styles.dialogClose]} aria-hidden>
                {"×"}
              </span>
              <Text as="span" look="bodySmall" weight="semibold">
                {t({ en: "Archive this list?", zh: "归档这个清单？" })}
              </Text>
              <div css={[corner.radius_1, styles.dialogBar]} />
              <div css={[corner.radius_1, styles.dialogBarShort]} />
            </div>
          }
          doCaption={t({
            en: "Always name the dialog with aria-label or aria-labelledby so it's announced on open.",
            zh: "始终用 aria-label 或 aria-labelledby 为对话框命名，以便打开时被宣读。",
          })}
          dont={
            <div css={[corner.radius_3, styles.dialogSample]}>
              <span css={[typeRole.body, styles.dialogClose]} aria-hidden>
                {"×"}
              </span>
              <div css={[corner.radius_1, styles.dialogBar]} />
              <div css={[corner.radius_1, styles.dialogBarShort]} />
            </div>
          }
          dontCaption={t({
            en: "Don't rely on the close button alone — an unnamed dialog gives screen-reader users no context.",
            zh: "不要只依赖关闭按钮——未命名的对话框无法为屏幕阅读器用户提供上下文。",
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  // A phone's proportions, so the card reads as floating at the bottom of a
  // screen.
  diagram: {
    inlineSize: space._13,
    maxInlineSize: "100%",
    blockSize: space._14,
  },
  // No `alignItems`: the specimen takes the full width so its code panel does
  // too.
  dialogSample: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    inlineSize: "100%",
    padding: space._3,
    paddingInlineEnd: space._6,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
  dialogClose: {
    position: "absolute",
    insetBlockStart: space._2,
    insetInlineEnd: space._2,
    color: color.fgMuted,
    lineHeight: font.lineHeight_0,
  },
  dialogBar: {
    blockSize: space._1,
    inlineSize: "100%",
    backgroundColor: color.bgNeutralSubtle,
  },
  dialogBarShort: {
    blockSize: space._1,
    inlineSize: "60%",
    backgroundColor: color.bgNeutralSubtle,
  },
});
