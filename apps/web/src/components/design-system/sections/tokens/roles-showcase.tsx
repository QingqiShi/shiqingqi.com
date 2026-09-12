import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { RoleColumn } from "../../role-column.tsx";
import { Showcase } from "../../showcase.tsx";

export function RolesShowcase() {
  return (
    <Showcase label={t({ en: "Roles", zh: "角色" })} frame="plain" breakout>
      <div css={styles.grid}>
        <RoleColumn
          name={t({ en: "Neutral", zh: "中性" })}
          cells={[
            {
              size: "large",
              bg: styles.fillNeutral,
              fg: styles.textOnNeutral,
              label: t({ en: "Neutral", zh: "中性" }),
              token: "color.neutral",
            },
            {
              size: "thin",
              bg: styles.fillNeutralHover,
              fg: styles.textOnNeutral,
              label: t({ en: "Neutral Hover", zh: "中性悬停" }),
              token: "color.neutralHover",
            },
            {
              size: "medium",
              bg: styles.fillSurfaceNeutralSubtle,
              fg: styles.textOnBg,
              label: t({ en: "Neutral Surface", zh: "中性表面" }),
              token: "color.surfaceNeutralSubtle",
            },
            {
              size: "thin",
              bg: styles.fillNeutralBorder,
              fg: styles.textOnBg,
              label: t({ en: "Neutral Border", zh: "中性边框" }),
              token: "color.neutralBorder",
            },
            {
              size: "thin",
              bg: styles.fillCanvas,
              fg: styles.textNeutralText,
              label: t({ en: "Neutral Text", zh: "中性文字" }),
              token: "color.neutralText",
            },
          ]}
        />
        <RoleColumn
          name={t({ en: "Accent", zh: "强调" })}
          cells={[
            {
              size: "large",
              bg: styles.fillAccent,
              fg: styles.accentOn,
              label: t({ en: "Accent", zh: "强调" }),
              token: "color.accent",
            },
            {
              size: "thin",
              bg: styles.fillAccentHover,
              fg: styles.accentOn,
              label: t({ en: "Accent Hover", zh: "强调悬停" }),
              token: "color.accentHover",
            },
            {
              size: "medium",
              bg: styles.fillSurfaceAccentSubtle,
              fg: styles.accentText,
              label: t({ en: "Accent Surface", zh: "强调表面" }),
              token: "color.surfaceAccentSubtle",
            },
            {
              size: "thin",
              bg: styles.fillAccentBorder,
              fg: styles.accentText,
              label: t({ en: "Accent Border", zh: "强调边框" }),
              token: "color.accentBorder",
            },
            {
              size: "thin",
              bg: styles.fillCanvas,
              fg: styles.accentText,
              label: t({ en: "Accent Text", zh: "强调文字" }),
              token: "color.accentText",
            },
          ]}
        />
        <RoleColumn
          name={t({ en: "Info", zh: "信息" })}
          cells={[
            {
              size: "large",
              bg: styles.fillInfo,
              fg: styles.textInfoOn,
              label: t({ en: "Info", zh: "信息" }),
              token: "color.info",
            },
            {
              size: "thin",
              bg: styles.fillInfoHover,
              fg: styles.textInfoOn,
              label: t({ en: "Info Hover", zh: "信息悬停" }),
              token: "color.infoHover",
            },
            {
              size: "medium",
              bg: styles.fillSurfaceInfoSubtle,
              fg: styles.textInfoText,
              label: t({ en: "Info Surface", zh: "信息表面" }),
              token: "color.surfaceInfoSubtle",
            },
            {
              size: "thin",
              bg: styles.fillInfoBorder,
              fg: styles.textInfoText,
              label: t({ en: "Info Border", zh: "信息边框" }),
              token: "color.infoBorder",
            },
            {
              size: "thin",
              bg: styles.fillCanvas,
              fg: styles.textInfoText,
              label: t({ en: "Info Text", zh: "信息文字" }),
              token: "color.infoText",
            },
          ]}
        />
        <RoleColumn
          name={t({ en: "Success", zh: "成功" })}
          cells={[
            {
              size: "large",
              bg: styles.fillSuccess,
              fg: styles.textSuccessOn,
              label: t({ en: "Success", zh: "成功" }),
              token: "color.success",
            },
            {
              size: "thin",
              bg: styles.fillSuccessHover,
              fg: styles.textSuccessOn,
              label: t({ en: "Success Hover", zh: "成功悬停" }),
              token: "color.successHover",
            },
            {
              size: "medium",
              bg: styles.fillSurfaceSuccessSubtle,
              fg: styles.textSuccessText,
              label: t({ en: "Success Surface", zh: "成功表面" }),
              token: "color.surfaceSuccessSubtle",
            },
            {
              size: "thin",
              bg: styles.fillSuccessBorder,
              fg: styles.textSuccessText,
              label: t({ en: "Success Border", zh: "成功边框" }),
              token: "color.successBorder",
            },
            {
              size: "thin",
              bg: styles.fillCanvas,
              fg: styles.textSuccessText,
              label: t({ en: "Success Text", zh: "成功文字" }),
              token: "color.successText",
            },
          ]}
        />
        <RoleColumn
          name={t({ en: "Warning", zh: "警告" })}
          cells={[
            {
              size: "large",
              bg: styles.fillWarning,
              fg: styles.textWarningOn,
              label: t({ en: "Warning", zh: "警告" }),
              token: "color.warning",
            },
            {
              size: "thin",
              bg: styles.fillWarningHover,
              fg: styles.textWarningOn,
              label: t({ en: "Warning Hover", zh: "警告悬停" }),
              token: "color.warningHover",
            },
            {
              size: "medium",
              bg: styles.fillSurfaceWarningSubtle,
              fg: styles.textWarningText,
              label: t({ en: "Warning Surface", zh: "警告表面" }),
              token: "color.surfaceWarningSubtle",
            },
            {
              size: "thin",
              bg: styles.fillWarningBorder,
              fg: styles.textWarningText,
              label: t({ en: "Warning Border", zh: "警告边框" }),
              token: "color.warningBorder",
            },
            {
              size: "thin",
              bg: styles.fillCanvas,
              fg: styles.textWarningText,
              label: t({ en: "Warning Text", zh: "警告文字" }),
              token: "color.warningText",
            },
          ]}
        />
        <RoleColumn
          name={t({ en: "Danger", zh: "危险" })}
          cells={[
            {
              size: "large",
              bg: styles.fillDanger,
              fg: styles.textDangerOn,
              label: t({ en: "Danger", zh: "危险" }),
              token: "color.danger",
            },
            {
              size: "thin",
              bg: styles.fillDangerHover,
              fg: styles.textDangerOn,
              label: t({ en: "Danger Hover", zh: "危险悬停" }),
              token: "color.dangerHover",
            },
            {
              size: "medium",
              bg: styles.fillSurfaceDangerSubtle,
              fg: styles.textDangerText,
              label: t({ en: "Danger Surface", zh: "危险表面" }),
              token: "color.surfaceDangerSubtle",
            },
            {
              size: "thin",
              bg: styles.fillDangerBorder,
              fg: styles.textDangerText,
              label: t({ en: "Danger Border", zh: "危险边框" }),
              token: "color.dangerBorder",
            },
            {
              size: "thin",
              bg: styles.fillCanvas,
              fg: styles.textDangerText,
              label: t({ en: "Danger Text", zh: "危险文字" }),
              token: "color.dangerText",
            },
          ]}
        />
      </div>
    </Showcase>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    // 6 roles divide cleanly as 1×6, 2×3, or 6×1 — those breakpoints avoid orphans.
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(3, minmax(0, 1fr))",
      [breakpoints.lg]: "repeat(6, minmax(0, 1fr))",
    },
    // Auto-sized rows so the subgrid children share a row track per cell index.
    gridAutoRows: "auto",
    gap: space._2,
  },

  // Fill helpers
  // The Text row shows each intent's text token as text on the canvas it is
  // read on, not as a fill.
  fillCanvas: { backgroundColor: color.bgCanvas },
  fillAccent: { backgroundColor: color.accent },
  fillAccentHover: { backgroundColor: color.accentHover },
  fillAccentBorder: { backgroundColor: color.accentBorder },
  fillNeutral: { backgroundColor: color.neutral },
  fillNeutralHover: { backgroundColor: color.neutralHover },
  fillNeutralBorder: { backgroundColor: color.neutralBorder },
  fillSurfaceNeutralSubtle: { backgroundColor: color.surfaceNeutralSubtle },
  fillSurfaceAccentSubtle: { backgroundColor: color.surfaceAccentSubtle },
  fillSurfaceInfoSubtle: { backgroundColor: color.surfaceInfoSubtle },
  fillSurfaceSuccessSubtle: { backgroundColor: color.surfaceSuccessSubtle },
  fillSurfaceWarningSubtle: { backgroundColor: color.surfaceWarningSubtle },
  fillSurfaceDangerSubtle: { backgroundColor: color.surfaceDangerSubtle },
  fillInfo: { backgroundColor: color.info },
  fillInfoHover: { backgroundColor: color.infoHover },
  fillInfoBorder: { backgroundColor: color.infoBorder },
  fillSuccess: { backgroundColor: color.success },
  fillSuccessHover: { backgroundColor: color.successHover },
  fillSuccessBorder: { backgroundColor: color.successBorder },
  fillWarning: { backgroundColor: color.warning },
  fillWarningHover: { backgroundColor: color.warningHover },
  fillWarningBorder: { backgroundColor: color.warningBorder },
  fillDanger: { backgroundColor: color.danger },
  fillDangerHover: { backgroundColor: color.dangerHover },
  fillDangerBorder: { backgroundColor: color.dangerBorder },

  // Text-color helpers
  accentOn: { color: color.accentOn },
  accentText: { color: color.accentText },
  textOnBg: { color: color.textMain },
  textOnNeutral: { color: color.neutralOn },
  textNeutralText: { color: color.neutralText },
  textInfoOn: { color: color.infoOn },
  textInfoText: { color: color.infoText },
  textSuccessOn: { color: color.successOn },
  textSuccessText: { color: color.successText },
  textWarningOn: { color: color.warningOn },
  textWarningText: { color: color.warningText },
  textDangerOn: { color: color.dangerOn },
  textDangerText: { color: color.dangerText },
});
