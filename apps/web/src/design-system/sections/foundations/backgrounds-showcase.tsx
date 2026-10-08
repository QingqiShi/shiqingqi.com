import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, measure, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import {
  gridlineGround,
  gridlineTokens,
} from "#src/design-system/gridline-ground.stylex.ts";
import { GuideSection } from "#src/design-system/guide/guide-section.tsx";
import { Identifier } from "#src/design-system/identifier.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

interface BandCellProps {
  label: string;
  token: string;
  bg: StyleXStyles;
  fg?: StyleXStyles;
}

function BandCell({ label, token, bg, fg }: BandCellProps) {
  return (
    <div css={[styles.cell, bg]}>
      <span css={[typeRole.label, styles.label, fg]}>{label}</span>
      <span css={[typeRole.caption, styles.token, fg]}>
        <Identifier>{token}</Identifier>
      </span>
    </div>
  );
}

interface BandProps {
  name: string;
  /** What the band is for, in one or two sentences. */
  use: string;
  /** Cells per row from `md` up, or from `lg` up when `mdColumns` is set. */
  columns: number;
  /** Cells per row at `md`, for a band whose cells are too narrow there. */
  mdColumns?: number;
  /** The `UsageSnippet` for the band. */
  snippet: ReactNode;
  children: ReactNode;
}

function Band({
  name,
  use,
  columns,
  mdColumns = columns,
  snippet,
  children,
}: BandProps) {
  return (
    <section css={stack.item}>
      <header css={[stack.tight, styles.bandHeader]}>
        <Heading level={3}>{name}</Heading>
        <p css={[typeRole.bodySmall, styles.bandUse]}>{use}</p>
      </header>
      <Showcase frame="plain" breakout>
        <div
          css={[
            gridlineGround.base,
            styles.grid,
            styles.gridColumns(columns, mdColumns),
          ]}
        >
          {children}
        </div>
      </Showcase>
      {snippet}
    </section>
  );
}

export function BackgroundsShowcase() {
  return (
    <GuideSection
      title={t({ en: "Backgrounds", zh: "背景" })}
      lead={t({
        en: "A bg token is named for what the box is, not for how light it is. Pick the band by the job, then the token in it by elevation or state.",
        zh: "bg 令牌以盒子是什么命名，而不是以它有多亮命名。先按用途选组，再在组内按层级或状态选令牌。",
      })}
    >
      <div css={stack.group}>
        <Band
          name={t({ en: "Canvas", zh: "画布" })}
          use={t({
            en: "The page itself, behind everything. The root already paints it, so you set it again only on a full-bleed region that has to match the page. Fade is the colour a gradient on the canvas runs toward.",
            zh: "页面本身，位于一切之后。根元素已经绘制了它，只有需要与页面一致的通栏区域才要再设一次。Fade 是画布上的渐变所淡向的颜色。",
          })}
          columns={2}
          snippet={
            <UsageSnippet
              code={`import { color } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  band: { backgroundColor: color.bgCanvas },
  fadeOut: {
    backgroundImage: \`linear-gradient(transparent, \${color.bgCanvasFade})\`,
  },
});`}
            />
          }
        >
          <BandCell
            label={t({ en: "Canvas", zh: "画布" })}
            token="color.bgCanvas"
            bg={styles.fillCanvas}
          />
          <BandCell
            label={t({ en: "Fade", zh: "渐隐" })}
            token="color.bgCanvasFade"
            bg={styles.fillFade(color.bgCanvasFade, color.bgCanvas)}
          />
        </Band>

        <Band
          name={t({ en: "Surface", zh: "表面" })}
          use={t({
            en: "Anything that holds content of its own: a card, a panel, a dialog body. Sunken sits below its surface, like the track behind SegmentedControl's options. Raised floats above it, like Popover and the MenuButton menu. In light, Raised and the default are the same white, so a floating surface also needs its edge: popoverSurface from @tuja/ui/components/popover-surface.stylex carries both.",
            zh: "任何承载自身内容的东西：卡片、面板、对话框主体。Sunken 位于所在表面之下，例如 SegmentedControl 选项背后的轨道。Raised 悬浮在表面之上，例如 Popover 与 MenuButton 的菜单。浅色下 Raised 与默认表面是同一种白色，因此悬浮表面还需要边缘：@tuja/ui/components/popover-surface.stylex 中的 popoverSurface 两者兼备。",
          })}
          columns={4}
          mdColumns={2}
          snippet={
            <UsageSnippet
              code={`const styles = stylex.create({
  card: { backgroundColor: color.bgSurface },
  well: { backgroundColor: color.bgSurfaceSunken },
  popover: { backgroundColor: color.bgSurfaceRaised },
});`}
            />
          }
        >
          <BandCell
            label={t({ en: "Sunken", zh: "下沉" })}
            token="color.bgSurfaceSunken"
            bg={styles.fillSurfaceSunken}
          />
          <BandCell
            label={t({ en: "Default", zh: "默认" })}
            token="color.bgSurface"
            bg={styles.fillSurface}
          />
          <BandCell
            label={t({ en: "Raised", zh: "抬起" })}
            token="color.bgSurfaceRaised"
            bg={styles.fillSurfaceRaised}
          />
          <BandCell
            label={t({ en: "Fade", zh: "渐隐" })}
            token="color.bgSurfaceFade"
            bg={styles.fillFade(color.bgSurfaceFade, color.bgSurface)}
          />
        </Band>

        <Band
          name={t({ en: "Control", zh: "控件" })}
          use={t({
            en: "Anything a person presses or types into: a button, a field, a row that opens something. Hover lifts it to bgControlHover. Disabled, it keeps its rest fill on hover and fades as a whole with opacity.disabled; fields and Checkbox also switch to bgControlDisabled. A selected item takes bgControlSelected from the selected primitive, which reads the item's ARIA state. No component uses bgControlPressed.",
            zh: "任何被按下或输入的东西：按钮、输入框、点开后进入别处的行。悬停时升到 bgControlHover。禁用时，悬停也保持静止填充，并通过 opacity.disabled 整体变淡；输入框与 Checkbox 还会换成 bgControlDisabled。选中项从 selected 原语取得 bgControlSelected，该原语读取元素的 ARIA 状态。没有任何组件使用 bgControlPressed。",
          })}
          columns={5}
          snippet={
            <UsageSnippet
              code={`import { selected, selectedTokens } from "@tuja/ui/primitives/selected.stylex";
import { color, opacity } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  row: {
    [selectedTokens.rest]: color.bgControl,
    opacity: { default: null, ":disabled": opacity.disabled },
  },
});

<button aria-current={isCurrent} css={[styles.row, selected.quiet]} />`}
            />
          }
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
          name={t({ en: "Bright, inverse and scrim", zh: "明亮、反相与遮罩" })}
          use={t({
            en: 'Grounds that take a foreground of their own, so each pairs with its fgOn token. Bright stays light in both schemes: the Switch and Slider thumbs, and Button with bright. Inverse is dark in light and light in dark: Avatar with look="solid". Scrim is the same translucent black in both, and dims the page behind a modal surface.',
            zh: '需要专属前景色的底面，因此每一种都搭配自己的 fgOn 令牌。Bright 在两种配色方案下都保持浅色：Switch 与 Slider 的手柄，以及设置了 bright 的 Button。Inverse 在浅色下是深色、在深色下是浅色：look="solid" 的 Avatar。Scrim 在两种方案下是同一种半透明黑色，用于压暗模态表面背后的页面。',
          })}
          columns={3}
          snippet={
            <UsageSnippet
              code={`const styles = stylex.create({
  tooltip: {
    backgroundColor: color.bgInverse,
    color: color.fgOnInverse,
  },
});`}
            />
          }
        >
          <BandCell
            label={t({ en: "Bright", zh: "明亮" })}
            token="color.bgControlBright"
            bg={styles.fillBright}
            fg={styles.fgOnControlBright}
          />
          <BandCell
            label={t({ en: "Inverse", zh: "反相" })}
            token="color.bgInverse"
            bg={styles.fillInverse}
            fg={styles.fgOnInverse}
          />
          <BandCell
            label={t({ en: "Scrim", zh: "遮罩" })}
            token="color.bgScrim"
            bg={styles.fillScrim}
            fg={styles.fgOnScrim}
          />
        </Band>
      </div>
    </GuideSection>
  );
}

const styles = stylex.create({
  bandHeader: {
    maxInlineSize: measure.prose,
  },
  bandUse: {
    margin: 0,
    color: color.fgMuted,
  },
  grid: {
    display: "grid",
    gap: gridlineTokens.width,
  },
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
    gap: rhythm.tight,
    paddingBlock: space._3,
    paddingInline: space._3,
    minBlockSize: "88px",
    minInlineSize: 0,
  },
  label: {
    fontWeight: font.weight_6,
    color: color.fg,
  },
  // Caption size at full fgMuted strength: dimmer than this falls under AA on
  // the lighter cells.
  token: {
    fontFamily: font.familyMono,
    color: color.fgMuted,
  },

  // The fade token over the ground it fades from, so the cell face stays
  // opaque for the gridline-via-gap ground.
  fillFade: (fade: string, ground: string) => ({
    backgroundImage: `linear-gradient(180deg, transparent 0%, ${fade} 100%), linear-gradient(${ground}, ${ground})`,
  }),

  fillCanvas: { backgroundColor: color.bgCanvas },

  fillSurfaceSunken: { backgroundColor: color.bgSurfaceSunken },
  fillSurface: { backgroundColor: color.bgSurface },
  fillSurfaceRaised: { backgroundColor: color.bgSurfaceRaised },

  fillControl: { backgroundColor: color.bgControl },
  fillControlHover: { backgroundColor: color.bgControlHover },
  fillControlPressed: { backgroundColor: color.bgControlPressed },
  fillControlSelected: { backgroundColor: color.bgControlSelected },
  fillControlDisabled: { backgroundColor: color.bgControlDisabled },

  fillBright: { backgroundColor: color.bgControlBright },
  fgOnControlBright: { color: color.fgOnControlBright },
  fillInverse: { backgroundColor: color.bgInverse },
  fgOnInverse: { color: color.fgOnInverse },
  // The scrim is translucent. Drawn over a bright fill, the cell shows it
  // dimming something and stays opaque for the gridline ground.
  fillScrim: {
    backgroundColor: color.bgControlBright,
    backgroundImage: `linear-gradient(${color.bgScrim}, ${color.bgScrim})`,
  },
  fgOnScrim: { color: color.fgOnScrim },
});
