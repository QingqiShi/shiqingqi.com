import { BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { ChatIcon } from "@phosphor-icons/react/dist/ssr/Chat";
import { CubeIcon } from "@phosphor-icons/react/dist/ssr/Cube";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/dist/ssr/GlobeHemisphereWest";
import { HeartIcon } from "@phosphor-icons/react/dist/ssr/Heart";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { MagicWandIcon } from "@phosphor-icons/react/dist/ssr/MagicWand";
import { PaletteIcon } from "@phosphor-icons/react/dist/ssr/Palette";
import { PlayIcon } from "@phosphor-icons/react/dist/ssr/Play";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { StarIcon } from "@phosphor-icons/react/dist/ssr/Star";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { IconButton } from "@tuja/ui/components/icon-button";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

// A representative slice of the Phosphor set. Names are the library's own Pascal
// identifiers (used verbatim in the import path), so they carry no locale.
const GALLERY = [
  { name: "House", Icon: HouseIcon },
  { name: "MagicWand", Icon: MagicWandIcon },
  { name: "Sparkle", Icon: SparkleIcon },
  { name: "Lightning", Icon: LightningIcon },
  { name: "Star", Icon: StarIcon },
  { name: "Heart", Icon: HeartIcon },
  { name: "Bell", Icon: BellIcon },
  { name: "Chat", Icon: ChatIcon },
  { name: "GlobeHemisphereWest", Icon: GlobeHemisphereWestIcon },
  { name: "Palette", Icon: PaletteIcon },
  { name: "Cube", Icon: CubeIcon },
  { name: "Play", Icon: PlayIcon },
];

export function IconographyShowcase() {
  // Same glyph at each type-scale token — the icon inherits font-size via its
  // default 1em box, so no per-size prop is needed. Built in render scope so it
  // can reference the `styles` created below.
  const sizes = [
    { token: "uiBodySmall", slot: styles.szBodySmall },
    { token: "uiBody", slot: styles.szBody },
    { token: "uiHeading3", slot: styles.szHeading3 },
    { token: "uiHeading2", slot: styles.szHeading2 },
    { token: "uiHeading1", slot: styles.szHeading1 },
    { token: "uiSubDisplay", slot: styles.szSubDisplay },
  ];

  return (
    <>
      <Showcase label={t({ en: "The set", zh: "图标集" })}>
        <ShowcaseHelper>
          {t({
            en: "The app draws from Phosphor. Each glyph imports from its own SSR entry so only the icons you use ship to the client — no barrel import, no full-set bundle.",
            zh: "应用采用 Phosphor 图标。每个字形从各自的 SSR 入口单独引入，因此只有用到的图标会发送到客户端——不走桶文件、不打包整套图标。",
          })}
        </ShowcaseHelper>
        <div css={styles.gallery}>
          {GALLERY.map(({ name, Icon }) => (
            <div key={name} css={styles.galleryItem}>
              <span css={styles.galleryGlyph}>
                <Icon aria-hidden />
              </span>
              <span css={styles.galleryName}>{name}</span>
            </div>
          ))}
        </div>
      </Showcase>

      <Showcase label={t({ en: "Weight", zh: "字重" })}>
        <ShowcaseHelper>
          {t({
            en: "Two weights carry the app: regular for the default, bold for icons paired with text or standing in as an action. Match the icon weight to the surrounding type.",
            zh: "应用主要使用两种字重：常规用于默认状态，加粗用于与文字搭配或充当操作的图标。让图标字重与周围文字相称。",
          })}
        </ShowcaseHelper>
        <div css={styles.weightRow}>
          <div css={styles.weightCol}>
            <span css={styles.weightGlyph}>
              <SparkleIcon weight="regular" aria-hidden />
              <LightningIcon weight="regular" aria-hidden />
              <HeartIcon weight="regular" aria-hidden />
            </span>
            <span css={styles.weightLabel}>weight=&quot;regular&quot;</span>
          </div>
          <div css={styles.weightCol}>
            <span css={styles.weightGlyph}>
              <SparkleIcon weight="bold" aria-hidden />
              <LightningIcon weight="bold" aria-hidden />
              <HeartIcon weight="bold" aria-hidden />
            </span>
            <span css={styles.weightLabel}>weight=&quot;bold&quot;</span>
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Size", zh: "尺寸" })}>
        <ShowcaseHelper>
          {t({
            en: "Icons size with font-size, not a width prop. Set the type token on the slot and the glyph follows — so an icon beside text always matches the line.",
            zh: "图标随 font-size 缩放，而非通过宽度属性。在插槽上设置文字排版令牌，字形便随之变化——因此文字旁的图标始终与行高相称。",
          })}
        </ShowcaseHelper>
        <div css={styles.sizeRow}>
          {sizes.map((size) => (
            <div key={size.token} css={styles.sizeItem}>
              <span css={[styles.sizeGlyph, size.slot]}>
                <StarIcon weight="fill" aria-hidden />
              </span>
              <span css={styles.sizeToken}>{size.token}</span>
            </div>
          ))}
        </div>
      </Showcase>

      <Showcase label={t({ en: "Pairing", zh: "搭配组件" })}>
        <ShowcaseHelper>
          {t({
            en: "Drop a Phosphor glyph straight into a Button, Badge, or IconButton. Each wraps the icon in an aria-hidden slot, so the visible label — or the button's aria-label — carries the name.",
            zh: "可将 Phosphor 字形直接放入 Button、Badge 或 IconButton。它们都会把图标包在 aria-hidden 插槽里，因此由可见标签——或按钮的 aria-label——承载名称。",
          })}
        </ShowcaseHelper>
        <div css={styles.pairRow}>
          <Button variant="primary" icon={<PlusIcon weight="bold" />}>
            {t({ en: "Add to list", zh: "加入列表" })}
          </Button>
          <Badge variant="accent" icon={<StarIcon weight="fill" />}>
            {t({ en: "Featured", zh: "精选" })}
          </Badge>
          <IconButton
            variant="surface"
            icon={<TrashIcon weight="bold" />}
            aria-label={t({ en: "Delete", zh: "删除" })}
          />
        </div>
      </Showcase>

      <UsageSnippet
        code={`// Import from the SSR entry so only this glyph ships to the client.
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";

// Decorative beside text — hide it from assistive tech.
<Button icon={<PlusIcon weight="bold" aria-hidden />}>Add</Button>

// Sizes with font-size; colour follows currentColor.
<span css={styles.iconSlot}>
  <PlusIcon />
</span>`}
      />

      <PropsTable
        rows={[
          {
            name: "weight",
            type: '"thin" | "light" | "regular" | "bold" | "fill" | "duotone"',
            defaultValue: '"regular"',
            description: t({
              en: "Stroke weight of the glyph. The app uses regular and bold.",
              zh: "字形的笔画粗细。应用使用常规与加粗两种。",
            }),
          },
          {
            name: "size",
            type: "number | string",
            defaultValue: '"1em"',
            description: t({
              en: "Rendered size. Defaults to 1em, so it scales with font-size — prefer sizing via the type token on the slot.",
              zh: "渲染尺寸。默认 1em，随 font-size 缩放——优先通过插槽上的文字排版令牌来设定尺寸。",
            }),
          },
          {
            name: "color",
            type: "string",
            defaultValue: '"currentColor"',
            description: t({
              en: "Fill / stroke colour. Inherits the surrounding text colour by default.",
              zh: "填充/描边颜色。默认继承周围文字的颜色。",
            }),
          },
          {
            name: "mirrored",
            type: "boolean",
            defaultValue: "false",
            description: t({
              en: "Flips the glyph horizontally for right-to-left layouts.",
              zh: "为从右到左的布局水平翻转字形。",
            }),
          },
          {
            name: "aria-hidden",
            type: "boolean",
            description: t({
              en: "Hide a decorative glyph from assistive tech — the recommended default when an icon sits beside text.",
              zh: "将装饰性字形对辅助技术隐藏——当图标与文字并列时的推荐默认做法。",
            }),
          },
        ]}
      />

      <DoDont
        do={
          <Button icon={<SparkleIcon weight="bold" />}>
            {t({ en: "Surprise me", zh: "随便看看" })}
          </Button>
        }
        doCaption={t({
          en: "Let a visible label name the action and keep the icon decorative — or give an icon-only control an aria-label.",
          zh: "用可见标签命名操作并让图标保持装饰性——纯图标控件则需提供 aria-label。",
        })}
        dont={
          <span css={styles.dontIcon}>
            <MagicWandIcon weight="bold" />
          </span>
        }
        dontCaption={t({
          en: "Don't ship an icon-only control with no accessible name — a screen reader announces nothing to act on.",
          zh: "不要发布没有可访问名称的纯图标控件——屏幕阅读器无法读出可操作的内容。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  gallery: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: space._2,
  },
  galleryItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._2,
    paddingBlock: space._3,
    paddingInline: space._2,
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
    minInlineSize: 0,
  },
  galleryGlyph: {
    display: "inline-flex",
    fontSize: font.uiHeading1,
    color: color.textMain,
  },
  galleryName: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
    textAlign: "center",
    overflowWrap: "anywhere",
    maxInlineSize: "100%",
  },
  weightRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: space._3,
  },
  weightCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._2,
    paddingBlock: space._4,
    paddingInline: space._3,
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  weightGlyph: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._3,
    fontSize: font.uiHeading1,
    color: color.textMain,
  },
  weightLabel: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
  },
  sizeRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: space._5,
    paddingBlock: space._3,
    paddingInline: space._3,
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  sizeItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._2,
  },
  sizeGlyph: {
    display: "inline-flex",
    color: color.accent,
  },
  szBodySmall: { fontSize: font.uiBodySmall },
  szBody: { fontSize: font.uiBody },
  szHeading3: { fontSize: font.uiHeading3 },
  szHeading2: { fontSize: font.uiHeading2 },
  szHeading1: { fontSize: font.uiHeading1 },
  szSubDisplay: { fontSize: font.uiSubDisplay },
  sizeToken: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
  },
  pairRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space._3,
  },
  dontIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: space._8,
    blockSize: space._8,
    borderRadius: border.radius_round,
    fontSize: font.uiHeading2,
    color: color.textMuted,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
});
