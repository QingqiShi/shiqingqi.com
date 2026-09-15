import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { gridlineGround } from "../../gridline-ground.stylex.ts";
import { Identifier } from "../../identifier.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";

// Every `bg` token names the structure it paints. Each band below is one of
// those structures — the Canvas behind everything, a Surface, a Control, and
// the three grounds that carry an `fgOn*` token of their own — so a consumer
// picks by role rather than by tone.
//
// Layering follows RoleColumn: the grid owns all the chrome (radius, clip,
// and the gridline-via-gap hairlines — see `gridlineGround`), and each cell
// is a pure opaque fill with no border, shadow, or radius of its own.

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
      <span css={[styles.token, fg]}>
        <Identifier>{token}</Identifier>
      </span>
    </div>
  );
}

interface BandProps {
  name: string;
  description: string;
  children: React.ReactNode;
  /** Cells per row from `md` up, or from `lg` up when `mdColumns` is set. */
  columns: number;
  /** Cells per row at `md`, for a band whose cells are too narrow there. */
  mdColumns?: number;
}

function Band({
  name,
  description,
  children,
  columns,
  mdColumns = columns,
}: BandProps) {
  return (
    <section css={styles.band}>
      <header css={styles.bandHeader}>
        <span css={styles.bandName}>{name}</span>
        <span css={styles.bandDescription}>{description}</span>
      </header>
      <div
        css={[
          gridlineGround.base,
          styles.grid,
          styles.gridColumns(columns, mdColumns),
        ]}
      >
        {children}
      </div>
    </section>
  );
}

export function BackgroundsShowcase() {
  return (
    <Showcase
      label={t({ en: "Backgrounds", zh: "背景" })}
      frame="plain"
      breakout
    >
      <ShowcaseHelper>
        {t({
          en: "A bg token is named for the structure it paints, not for its tone — the canvas behind everything, a surface, a control, and the three grounds that need a foreground token of their own. Pick by what the background is for, and the tone follows.",
          zh: "bg 令牌以它所绘制的结构命名，而非以色调命名——一切背后的画布、表面、控件，以及需要专属前景色令牌的三种底面。按背景的用途选择，色调自然跟随。",
        })}
      </ShowcaseHelper>

      <div css={styles.stack}>
        <Band
          name={t({ en: "Canvas", zh: "画布" })}
          description={t({
            en: "The app shell, behind everything else.",
            zh: "应用外壳，位于其余一切之后。",
          })}
          columns={2}
        >
          <BandCell
            label={t({ en: "Canvas", zh: "画布" })}
            token="color.bgCanvas"
            bg={styles.fillCanvas}
            detail={t({
              en: "The page ground.",
              zh: "页面底色。",
            })}
          />
          <BandCell
            label={t({ en: "Fade", zh: "渐隐" })}
            token="color.bgCanvasFade"
            bg={styles.fillFade(color.bgCanvasFade, color.bgCanvas)}
            detail={t({
              en: "What a gradient on the canvas fades toward.",
              zh: "画布上的渐变所淡向的颜色。",
            })}
          />
        </Band>

        <Band
          name={t({ en: "Surface", zh: "表面" })}
          description={t({
            en: "Cards, panels, and dialog bodies. Raised is also the floating surface of a menu or a popover, which sits on layer.raised.",
            zh: "卡片、面板与对话框主体。Raised 同时也是菜单或弹出框的悬浮表面，位于 layer.raised。",
          })}
          columns={4}
          mdColumns={2}
        >
          <BandCell
            label={t({ en: "Sunken", zh: "下沉" })}
            token="color.bgSurfaceSunken"
            bg={styles.fillSurfaceSunken}
            detail={t({
              en: "Input wells and recessed regions.",
              zh: "输入凹位与退入的区域。",
            })}
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
            detail={t({ en: "Menu · popover.", zh: "菜单 · 弹出框。" })}
          />
          <BandCell
            label={t({ en: "Fade", zh: "渐隐" })}
            token="color.bgSurfaceFade"
            bg={styles.fillFade(color.bgSurfaceFade, color.bgSurface)}
            detail={t({
              en: "What a gradient on a surface fades toward.",
              zh: "表面上的渐变所淡向的颜色。",
            })}
          />
        </Band>

        <Band
          name={t({ en: "Control", zh: "控件" })}
          description={t({
            en: "Shared by buttons, list rows, and menu items. Rest, hover, pressed, selected, disabled — the last pairs with opacity.disabled, so it never lands at full strength.",
            zh: "按钮、列表行与菜单项共享。静态、悬停、按下、选中、禁用——禁用需搭配 opacity.disabled，因此永远不会以完整强度呈现。",
          })}
          columns={5}
        >
          <BandCell
            label={t({ en: "Rest", zh: "静态" })}
            token="color.bgControl"
            bg={styles.fillControl}
          />
          <BandCell
            label={t({ en: "Hover", zh: "悬停" })}
            token="color.bgControlHover"
            bg={styles.fillControlHover}
          />
          <BandCell
            label={t({ en: "Pressed", zh: "按下" })}
            token="color.bgControlPressed"
            bg={styles.fillControlPressed}
          />
          <BandCell
            label={t({ en: "Selected", zh: "选中" })}
            token="color.bgControlSelected"
            bg={styles.fillControlSelected}
          />
          <BandCell
            label={t({ en: "Disabled", zh: "禁用" })}
            token="color.bgControlDisabled"
            bg={styles.fillControlDisabled}
          />
        </Band>

        <Band
          name={t({ en: "Bright · Inverse · Scrim", zh: "明亮 · 反相 · 遮罩" })}
          description={t({
            en: "The three grounds that carry a foreground token of their own. Bright stays light in both themes, inverse flips the theme, and the scrim dims the page behind a modal.",
            zh: "带有专属前景色令牌的三种底面。明亮在两种主题下都保持浅色，反相翻转主题，遮罩让弹窗背后的页面变暗。",
          })}
          columns={3}
        >
          <BandCell
            label={t({ en: "Bright", zh: "明亮" })}
            token="color.bgControlBright"
            bg={styles.fillBright}
            fg={styles.fgOnControlBright}
            detail={t({
              en: "Switch · slider thumb.",
              zh: "开关 · 滑块手柄。",
            })}
          />
          <BandCell
            label={t({ en: "Inverse", zh: "反相" })}
            token="color.bgInverse"
            bg={styles.fillInverse}
            fg={styles.fgOnInverse}
            detail={t({ en: "Tooltip · snackbar.", zh: "提示 · 消息条。" })}
          />
          <BandCell
            label={t({ en: "Scrim", zh: "遮罩" })}
            token="color.bgScrim"
            bg={styles.fillScrim}
            fg={styles.fgOnScrim}
            detail={t({ en: "Modal dim layer.", zh: "弹窗变暗层。" })}
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
    color: color.fg,
    letterSpacing: font.trackingWider,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  bandDescription: {
    fontSize: font.uiCaption,
    color: color.fgMuted,
    lineHeight: font.lineHeight_4,
  },
  // Ground, frame, and clip come from `gridlineGround`. The Canvas band's
  // Canvas swatch shares the interior ground, so it reads flush there while the
  // frame keeps a crisp edge.
  grid: {
    display: "grid",
    gap: space._00,
  },
  // One cell per row on a phone, then the band's own count.
  gridColumns: (columns: number, mdColumns: number) => ({
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: `repeat(${mdColumns.toString()}, minmax(0, 1fr))`,
      [breakpoints.lg]: `repeat(${columns.toString()}, minmax(0, 1fr))`,
    },
  }),
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
    color: color.fg,
  },
  detail: {
    marginBlockStart: "auto",
    fontSize: font.uiCaption,
    color: color.fgMuted,
    lineHeight: font.lineHeight_2,
  },
  // The token name is read, not glanced at, so it sits at the caption size
  // rather than the overline size, at the full strength of `fgMuted` — the
  // token is now the quiet end of the text ladder, and dimming it further
  // would drop it back under AA on every surface lighter than a white card.
  // Tight tracking buys back the width the larger size costs, so the longest
  // names (`color.bgControlSelected`, `…Disabled`) still set on one line in
  // the five-column Control band.
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    letterSpacing: font.trackingTight,
    color: color.fgMuted,
    lineHeight: font.lineHeight_2,
  },

  // A fade cell is two layers: the fade token drawn over the ground it fades
  // from, which keeps the cell face opaque for the gridline-via-gap technique.
  fillFade: (fade: string, ground: string) => ({
    backgroundImage: `linear-gradient(180deg, transparent 0%, ${fade} 100%), linear-gradient(${ground}, ${ground})`,
  }),

  // Canvas band
  fillCanvas: { backgroundColor: color.bgCanvas },

  // Surface band
  fillSurfaceSunken: { backgroundColor: color.bgSurfaceSunken },
  fillSurface: { backgroundColor: color.bgSurface },
  fillSurfaceRaised: { backgroundColor: color.bgSurfaceRaised },

  // Control band
  fillControl: { backgroundColor: color.bgControl },
  fillControlHover: { backgroundColor: color.bgControlHover },
  fillControlPressed: { backgroundColor: color.bgControlPressed },
  fillControlSelected: { backgroundColor: color.bgControlSelected },
  // No `fg` override: `fg` is for fills that need a different foreground to
  // stay legible (bright, inverse, scrim). Dimming this cell's label would
  // instead be documenting a disabled-text token, and there isn't one — a
  // disabled control fades as a whole through opacity. The fill is the specimen.
  fillControlDisabled: { backgroundColor: color.bgControlDisabled },

  // Bright · inverse · scrim band
  fillBright: { backgroundColor: color.bgControlBright },
  fgOnControlBright: { color: color.fgOnControlBright },
  fillInverse: { backgroundColor: color.bgInverse },
  fgOnInverse: { color: color.fgOnInverse },
  fillScrim: {
    // bgScrim itself is translucent; composite it above a bright surface so
    // the "dim layer over content" metaphor reads in the swatch — and so the
    // cell face stays opaque for the gridline-via-gap technique.
    backgroundColor: color.bgControlBright,
    backgroundImage: `linear-gradient(${color.bgScrim}, ${color.bgScrim})`,
  },
  fgOnScrim: { color: color.fgOnScrim },
});
