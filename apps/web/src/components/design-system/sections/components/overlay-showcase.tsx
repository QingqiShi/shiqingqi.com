import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
import { OverlayDemo } from "./overlay-specimens.tsx";

export function OverlayShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Overlay", zh: "覆盖层" })}>
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "A full-screen overlay that traps focus, locks scroll, closes on Escape or backdrop click, and restores focus on exit. Open it, then press Escape or use the close button.",
              zh: "全屏覆盖层：捕获焦点、锁定滚动，按 Escape 或点击背景即可关闭，退出时恢复焦点。打开后可按 Escape 或使用关闭按钮。",
            })}
          </Text>
          <Specimen caption={t({ en: "open and dismiss", zh: "打开与关闭" })}>
            <OverlayDemo />
          </Specimen>
        </div>
      </Showcase>

      <PropsTable component="overlay" />

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <div css={[corner.radius_3, styles.dialogSample]}>
              <span css={styles.dialogClose} aria-hidden>
                {"×"}
              </span>
              <Text as="span" look="bodySmall" weight="semibold">
                {t({ en: "Official trailer", zh: "官方预告" })}
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
              <span css={styles.dialogClose} aria-hidden>
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
  // No `alignItems`: the specimen takes the full width so its code panel does
  // too.
  stack: {
    gap: space._3,
  },
  dialogSample: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    inlineSize: "100%",
    padding: space._3,
    paddingInlineEnd: space._6,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
  },
  dialogClose: {
    position: "absolute",
    insetBlockStart: space._2,
    insetInlineEnd: space._2,
    color: color.textSubtle,
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_0,
  },
  dialogBar: {
    blockSize: space._1,
    inlineSize: "100%",
    backgroundColor: color.neutralSurface,
  },
  dialogBarShort: {
    blockSize: space._1,
    inlineSize: "60%",
    backgroundColor: color.neutralSurface,
  },
});
