import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";

// Role-based background taxonomy. Each band groups tokens that share a
// purpose — Page scaffolding, Surface cards, Interactive states, Inverse
// callouts, and Overlay popovers + scrim — so a consumer picks by role
// rather than by tonal step.
//
// Layering follows RoleColumn: the grid owns all the chrome (radius, clip,
// and the gridline-via-gap hairlines), and each cell is a pure opaque fill
// with no border, shadow, or radius of its own.

interface BandCellProps {
  label: string;
  token: string;
  bg: StyleXStyles;
  fg?: StyleXStyles;
  detail?: string;
}

function BandCell({ label, token, bg, fg, detail }: BandCellProps) {
  return (
    <div css={[styles.cell, bg]}>
      <span css={[styles.label, fg]}>{label}</span>
      {detail ? <span css={[styles.detail, fg]}>{detail}</span> : null}
      <span css={[styles.token, fg]}>{token}</span>
    </div>
  );
}

interface BandProps {
  name: string;
  description: string;
  children: React.ReactNode;
  columns: 2 | 4 | 5;
}

function Band({ name, description, children, columns }: BandProps) {
  const gridStyle =
    columns === 2
      ? styles.gridTwo
      : columns === 4
        ? styles.gridFour
        : styles.gridFive;

  return (
    <section css={styles.band}>
      <header css={styles.bandHeader}>
        <span css={styles.bandName}>{name}</span>
        <span css={styles.bandDescription}>{description}</span>
      </header>
      <div css={[styles.grid, gridStyle]}>{children}</div>
    </section>
  );
}

export function BackgroundsShowcase() {
  return (
    <Showcase label={t({ en: "Surfaces", zh: "表面" })} frame="plain">
      <ShowcaseHelper>
        {t({
          en: "Surfaces are organised by role, not tonal step. Pick by what the surface is for — scaffolding, a card, an interactive state, an attention-grabbing inverse, or a floating overlay — and the right tone follows.",
          zh: "表面按角色组织，而非明度阶梯。按用途选择——脚手架、卡片、交互状态、反相强调或悬浮覆盖层——对应的色调自然跟随。",
        })}
      </ShowcaseHelper>

      <div css={styles.stack}>
        <Band
          name={t({ en: "Page", zh: "页面" })}
          description={t({
            en: "App shell and scaffolding behind everything else.",
            zh: "应用外壳与所有内容背后的脚手架。",
          })}
          columns={2}
        >
          <BandCell
            label={t({ en: "Canvas", zh: "画布" })}
            token="color.bgCanvas"
            bg={styles.fillCanvas}
            detail={t({
              en: "Main page background.",
              zh: "主页面背景。",
            })}
          />
          <BandCell
            label={t({ en: "Canvas subtle", zh: "画布暗淡" })}
            token="color.bgCanvasSubtle"
            bg={styles.fillCanvasSubtle}
            detail={t({
              en: "Recessed scaffolding region.",
              zh: "退入的脚手架区域。",
            })}
          />
        </Band>

        <Band
          name={t({ en: "Surface", zh: "表面" })}
          description={t({
            en: "Cards, panels, and dialog bodies. Sunken inputs, default cards, raised hover lift, bright callouts.",
            zh: "卡片、面板与对话框主体。下沉的输入框、默认卡片、悬浮抬起、明亮强调。",
          })}
          columns={4}
        >
          <BandCell
            label={t({ en: "Sunken", zh: "下沉" })}
            token="color.bgSurfaceSunken"
            bg={styles.fillSurfaceSunken}
            detail={t({ en: "Input wells.", zh: "输入凹位。" })}
          />
          <BandCell
            label={t({ en: "Default", zh: "默认" })}
            token="color.bgSurface"
            bg={styles.fillSurface}
            detail={t({ en: "Card body.", zh: "卡片主体。" })}
          />
          <BandCell
            label={t({ en: "Raised", zh: "抬起" })}
            token="color.bgSurfaceRaised"
            bg={styles.fillSurfaceRaised}
            detail={t({ en: "Hover lift.", zh: "悬浮抬起。" })}
          />
          <BandCell
            label={t({ en: "Bright", zh: "明亮" })}
            token="color.bgSurfaceBright"
            bg={styles.fillSurfaceBright}
            fg={styles.textOnBright}
            detail={t({ en: "High-contrast pop.", zh: "高对比强调。" })}
          />
        </Band>

        <Band
          name={t({ en: "Interactive", zh: "交互" })}
          description={t({
            en: "Shared by buttons, list rows, and menu items. Rest, hover, pressed, selected, disabled.",
            zh: "按钮、列表行与菜单项共享。静态、悬停、按下、选中、禁用。",
          })}
          columns={5}
        >
          <BandCell
            label={t({ en: "Rest", zh: "静态" })}
            token="color.bgInteractiveRest"
            bg={styles.fillInteractiveRest}
          />
          <BandCell
            label={t({ en: "Hover", zh: "悬停" })}
            token="color.bgInteractiveHover"
            bg={styles.fillInteractiveHover}
          />
          <BandCell
            label={t({ en: "Pressed", zh: "按下" })}
            token="color.bgInteractivePressed"
            bg={styles.fillInteractivePressed}
          />
          <BandCell
            label={t({ en: "Selected", zh: "选中" })}
            token="color.bgInteractiveSelected"
            bg={styles.fillInteractiveSelected}
          />
          <BandCell
            label={t({ en: "Disabled", zh: "禁用" })}
            token="color.bgInteractiveDisabled"
            bg={styles.fillInteractiveDisabled}
            fg={styles.textDisabled}
          />
        </Band>

        <Band
          name={t({ en: "Inverse · Overlay", zh: "反相 · 覆盖" })}
          description={t({
            en: "Inverse flips theme to grab attention (tooltips, snackbars). Overlay floats above content (popovers); scrim dims the page behind a modal.",
            zh: "反相反转主题以吸引注意（提示、消息条）。覆盖层悬浮于内容之上（弹出框）；遮罩层在弹窗背后变暗页面。",
          })}
          columns={4}
        >
          <BandCell
            label={t({ en: "Inverse", zh: "反相" })}
            token="color.bgInverse"
            bg={styles.fillInverse}
            fg={styles.textInverseFg}
            detail={t({ en: "Tooltip · snackbar.", zh: "提示 · 消息条。" })}
          />
          <BandCell
            label={t({ en: "Overlay", zh: "覆盖" })}
            token="color.bgOverlay"
            bg={styles.fillOverlay}
            detail={t({ en: "Popover surface.", zh: "弹出层。" })}
          />
          <BandCell
            label={t({ en: "Scrim", zh: "遮罩" })}
            token="color.bgScrim"
            bg={styles.fillScrim}
            fg={styles.textOnScrim}
            detail={t({ en: "Modal dim layer.", zh: "弹窗变暗层。" })}
          />
          <BandCell
            label={t({ en: "Fade", zh: "渐隐" })}
            token="color.bgCanvasFade"
            bg={styles.fillChannels}
            detail={t({
              en: "Blend color for translucent fades.",
              zh: "用于半透明渐变的混合色。",
            })}
          />
        </Band>
      </div>
    </Showcase>
  );
}

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  band: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  bandHeader: {
    display: "flex",
    flexDirection: { default: "column", [breakpoints.md]: "row" },
    alignItems: { default: "flex-start", [breakpoints.md]: "baseline" },
    gap: { default: space._00, [breakpoints.md]: space._3 },
  },
  bandName: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    color: color.textMain,
    letterSpacing: font.trackingWider,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  bandDescription: {
    fontSize: font.uiCaption,
    color: color.textSubtle,
    lineHeight: font.lineHeight_4,
  },
  // Gridline-via-gap: the grid is a solid bgCanvas rectangle (the canvas ground
  // the surface tiles sit on); the opaque cells cover it except the gaps, so the
  // ground shows through as hairline dividers. The outer frame is neutralBorder
  // so the specimen still reads as a self-contained unit now that it sits on the
  // bare page canvas rather than inside a surface card — the Page band's Canvas
  // swatch shares the interior ground, so it reads flush there while the frame
  // keeps a crisp edge. A border (unlike padding) makes overflow shrink the clip
  // radius by its own width, so the corner cells stay concentric with the frame
  // instead of bulging the ground at the rounded corners.
  grid: {
    display: "grid",
    gap: space._00,
    backgroundColor: color.bgCanvas,
    borderWidth: space._00,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    borderRadius: border.radius_2,
    overflow: "hidden",
  },
  gridTwo: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(2, minmax(0, 1fr))",
    },
  },
  gridFour: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(2, minmax(0, 1fr))",
      [breakpoints.lg]: "repeat(4, minmax(0, 1fr))",
    },
  },
  gridFive: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(5, minmax(0, 1fr))",
    },
  },
  cell: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: space._0,
    paddingBlock: space._3,
    paddingInline: space._3,
    minBlockSize: "112px",
    minInlineSize: 0,
  },
  label: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingSnug,
    lineHeight: font.lineHeight_2,
    color: color.textMain,
  },
  detail: {
    marginBlockStart: "auto",
    fontSize: font.uiCaption,
    color: color.textSubtle,
    lineHeight: font.lineHeight_2,
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
    opacity: 0.85,
    lineHeight: font.lineHeight_2,
    overflowWrap: "anywhere",
  },

  // Page band
  fillCanvas: { backgroundColor: color.bgCanvas },
  fillCanvasSubtle: { backgroundColor: color.bgCanvasSubtle },

  // Surface band
  fillSurfaceSunken: { backgroundColor: color.bgSurfaceSunken },
  fillSurface: { backgroundColor: color.bgSurface },
  fillSurfaceRaised: { backgroundColor: color.bgSurfaceRaised },
  fillSurfaceBright: { backgroundColor: color.bgSurfaceBright },
  textOnBright: { color: color.textOnBright },

  // Interactive band
  fillInteractiveRest: { backgroundColor: color.bgInteractiveRest },
  fillInteractiveHover: { backgroundColor: color.bgInteractiveHover },
  fillInteractivePressed: { backgroundColor: color.bgInteractivePressed },
  fillInteractiveSelected: { backgroundColor: color.bgInteractiveSelected },
  fillInteractiveDisabled: { backgroundColor: color.bgInteractiveDisabled },
  textDisabled: { color: color.textSubtle, opacity: 0.7 },

  // Inverse / overlay band
  fillInverse: { backgroundColor: color.bgInverse },
  textInverseFg: { color: color.textOnInverse },
  fillOverlay: { backgroundColor: color.bgOverlay },
  fillScrim: {
    // bgScrim itself is translucent; composite it above a bright surface so
    // the "dim layer over content" metaphor reads in the swatch — and so the
    // cell face stays opaque for the gridline-via-gap technique.
    backgroundColor: color.bgSurfaceBright,
    backgroundImage: `linear-gradient(${color.bgScrim}, ${color.bgScrim})`,
  },
  // Scrim composites to ~70% black in both themes, so the foreground stays
  // white either way — pull a token that never flips.
  textOnScrim: { color: color.accentOn },
  fillChannels: {
    backgroundImage: `linear-gradient(180deg, transparent 0%, ${color.bgCanvasFade} 100%), linear-gradient(${color.bgSurface}, ${color.bgSurface})`,
  },
});
