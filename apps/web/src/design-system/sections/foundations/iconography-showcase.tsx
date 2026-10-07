import { BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { ChatIcon } from "@phosphor-icons/react/dist/ssr/Chat";
import { CubeIcon } from "@phosphor-icons/react/dist/ssr/Cube";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/dist/ssr/GlobeHemisphereWest";
import { HeartIcon } from "@phosphor-icons/react/dist/ssr/Heart";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { LightningIcon } from "@phosphor-icons/react/dist/ssr/Lightning";
import { MagicWandIcon } from "@phosphor-icons/react/dist/ssr/MagicWand";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { PaletteIcon } from "@phosphor-icons/react/dist/ssr/Palette";
import { PlayIcon } from "@phosphor-icons/react/dist/ssr/Play";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { StarIcon } from "@phosphor-icons/react/dist/ssr/Star";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { TextField } from "@tuja/ui/components/text-field";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { DoDont } from "#src/design-system/do-dont.tsx";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { Identifier } from "#src/design-system/identifier.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { SpecCard } from "#src/design-system/spec-card.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import { Anchor } from "#src/links/anchor.tsx";

// Phosphor's own Pascal names, used verbatim in the import path.
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
  const locale = getLocale();
  const sizes = [
    { token: "font.uiBodySmall", slot: styles.szBodySmall },
    { token: "font.uiBody", slot: styles.szBody },
    { token: "font.uiHeading3", slot: styles.szHeading3 },
    { token: "font.uiHeading2", slot: styles.szHeading2 },
    { token: "font.uiHeading1", slot: styles.szHeading1 },
    { token: "font.uiSubDisplay", slot: styles.szSubDisplay },
  ];

  const slots = [
    {
      term: "Button · AnchorButton · Chip · Badge",
      value: "icon",
      note: t({
        en: "Before the label, at the label's font size and colour. A Button with an icon and no children is icon-only.",
        zh: "位于标签之前，与标签同字号、同颜色。只有 icon 而没有 children 的 Button 即为纯图标按钮。",
      }),
    },
    {
      term: "TextField",
      value: "leading · trailing",
      note: t({
        en: "Inside the field, at the control's font size in the muted text colour. The field pads its text to make room.",
        zh: "位于输入框内，与控件同字号，使用次要文字颜色。输入框会为其留出内边距。",
      }),
    },
    {
      term: "Callout",
      value: "icon",
      note: t({
        en: "Each intent has a default. Pass another icon to replace it, or null to remove it.",
        zh: "每种意图色都有默认图标。传入其他图标即可替换，传入 null 则移除。",
      }),
    },
    {
      term: "SegmentedControl",
      value: "icon · selectedIcon",
      note: t({
        en: "Per option. selectedIcon shows only on the selected option. With hideLabels, every option needs an icon.",
        zh: "按选项设置。selectedIcon 只在选中项上显示。设置 hideLabels 时，每个选项都需要 icon。",
      }),
    },
    {
      term: "Disclosure",
      value: "icon · indicator",
      note: t({
        en: "icon leads the summary. indicator replaces the turning caret, or null removes it.",
        zh: "icon 位于摘要之前。indicator 替换会旋转的箭头，传入 null 则移除。",
      }),
    },
    {
      term: "Section · OptionCard",
      value: "icon",
      note: t({
        en: "Beside the title, in the muted text colour. OptionCard turns it to the accent colour when the card is selected.",
        zh: "位于标题旁，使用次要文字颜色。OptionCard 在卡片被选中时将其变为强调色。",
      }),
    },
    {
      term: "Overlay · Breadcrumb",
      value: "closeIcon · separator",
      note: t({
        en: "Replace the close icon and the separator between crumbs.",
        zh: "替换关闭图标，以及路径项之间的分隔符。",
      }),
    },
  ];

  const ownWeights = [
    {
      term: "bold",
      value: t({
        en: "Select, Disclosure, Breadcrumb, Overlay, SidebarLayout, ScrollMask, OptionCard",
        zh: "Select、Disclosure、Breadcrumb、Overlay、SidebarLayout、ScrollMask、OptionCard",
      }),
      note: t({
        en: "Every glyph inside a control: carets, close, menu, check and scroll arrows.",
        zh: "控件内的所有图形：箭头、关闭、菜单、勾选与滚动箭头。",
      }),
    },
    {
      term: "regular",
      value: "Callout",
      note: t({
        en: "The default icons for info, success, warning and danger.",
        zh: "info、success、warning 与 danger 的默认图标。",
      }),
    },
    {
      term: "fill",
      value: "Callout",
      note: t({
        en: "The default icons for accent and neutral.",
        zh: "accent 与 neutral 的默认图标。",
      }),
    },
  ];

  return (
    <>
      <GuideSection
        title={t({
          en: "Add Phosphor to your app",
          zh: "把 Phosphor 加入你的应用",
        })}
        lead={t({
          en: "The components draw their own icons with @phosphor-icons/react, which installs with @tuja/ui. The package does not re-export it, so to use an icon in your own code, add Phosphor to your app.",
          zh: "组件用 @phosphor-icons/react 绘制自带的图标，它会随 @tuja/ui 一起安装。本包不会转出它，因此要在自己的代码中使用图标，请把 Phosphor 加入你的应用。",
        })}
      >
        <UsageSnippet
          code={`// pnpm add @phosphor-icons/react@^2.1.10

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";`}
        />
        <GuideNote>
          {t({
            en: "Import each icon from dist/ssr/<Name>, the entry the package uses. It renders in a Server Component, ships only the icons you import, and shares one copy of Phosphor with the package when your version is in the same range. This entry does not read Phosphor's IconContext, so a context provider changes neither your icons nor the package's.",
            zh: "从 dist/ssr/<Name> 逐个导入图标，这也是本包使用的入口。它能在服务端组件中渲染，只打包你导入的图标；只要你的版本在相同范围内，就会与本包共用同一份 Phosphor。这个入口不读取 Phosphor 的 IconContext，因此上下文提供者既不会改变你的图标，也不会改变本包的图标。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Pass icons to a slot", zh: "把图标传给插槽" })}
        lead={t({
          en: "Components take icons through props. The slot sets the icon's size, colour and spacing, and hides it from assistive technology, so you pass the bare icon with nothing but its weight.",
          zh: "组件通过属性接收图标。插槽会设定图标的尺寸、颜色与间距，并对辅助技术隐藏它，因此你只需传入图标本身，最多加上 weight。",
        })}
      >
        <SpecimenGrid>
          <Specimen caption="Button">
            <Button look="primary" icon={<PlusIcon weight="bold" />}>
              {t({ en: "Add to list", zh: "加入列表" })}
            </Button>
          </Specimen>
          <Specimen caption="Badge">
            <Badge intent="accent" icon={<StarIcon weight="fill" />}>
              {t({ en: "Featured", zh: "精选" })}
            </Badge>
          </Specimen>
          <Specimen caption="TextField">
            <TextField
              label={t({ en: "Search films", zh: "搜索电影" })}
              labelHidden
              leading={<MagnifyingGlassIcon weight="bold" />}
              placeholder={t({ en: "Search films", zh: "搜索电影" })}
            />
          </Specimen>
        </SpecimenGrid>
        <GuideList items={slots} />
        <GuideNote>
          {t({
            en: "A slot takes any React node. Another icon set works if its icons are 1em square and fill with currentColor.",
            zh: "插槽接受任意 React 节点。只要图标为 1em 见方并以 currentColor 填充，其他图标库同样适用。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Size and colour come from the parent",
          zh: "尺寸与颜色取自父元素",
        })}
        lead={t({
          en: "A Phosphor icon is 1em square and fills with currentColor. The slots rely on this: they set a font size and a colour, and the icon follows. Outside a slot, do the same: set fontSize and color on the parent and leave the size and color props alone.",
          zh: "Phosphor 图标为 1em 见方，并以 currentColor 填充。插槽正依赖这一点：它们设定字号与颜色，图标随之变化。在插槽之外也这样做：在父元素上设置 fontSize 与 color，不要使用 size 与 color 属性。",
        })}
      >
        <div css={[corner.radius_2, styles.sizeRow]}>
          {sizes.map((size) => (
            <div key={size.token} css={styles.sizeItem}>
              <span css={[styles.sizeIcon, size.slot]}>
                <StarIcon weight="fill" aria-hidden />
              </span>
              <span css={styles.sizeToken}>
                <Identifier>{size.token}</Identifier>
              </span>
            </div>
          ))}
        </div>
        <UsageSnippet
          code={`const styles = stylex.create({
  slot: {
    display: "inline-flex",
    fontSize: font.uiHeading2,
    color: color.fgAccent,
  },
});

<span css={styles.slot}>
  <StarIcon weight="fill" aria-hidden />
</span>`}
        />
        <GuideNote>
          {t({
            en: "A Phosphor icon has no css prop. Style the element around it.",
            zh: "Phosphor 图标不接受 css 属性。请为包裹它的元素设置样式。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Weight", zh: "字重" })}
        lead={t({
          en: "Phosphor's default weight is regular. The package draws the glyphs inside its controls in bold, so an icon you put in a Button, Chip or field matches them at bold.",
          zh: "Phosphor 的默认字重是 regular。本包把控件内的图形都画成 bold，因此你放进 Button、Chip 或输入框的图标用 bold 才能与之一致。",
        })}
      >
        <DoDont
          do={
            <Button look="outline" icon={<PlusIcon weight="bold" />}>
              {t({ en: "Add to list", zh: "加入列表" })}
            </Button>
          }
          doCaption={t({
            en: 'weight="bold", the weight of the package\'s own control glyphs.',
            zh: 'weight="bold"，与本包控件自带图形的字重相同。',
          })}
          dont={
            <Button look="outline" icon={<PlusIcon />}>
              {t({ en: "Add to list", zh: "加入列表" })}
            </Button>
          }
          dontCaption={t({
            en: "No weight, so Phosphor's regular: lighter than every caret and close icon the package draws.",
            zh: "未传 weight，即 Phosphor 的 regular：比本包绘制的所有箭头与关闭图标都细。",
          })}
        />
        <GuideList items={ownWeights} />
      </GuideSection>

      <GuideSection
        title={t({
          en: "Name the control, not the icon",
          zh: "为控件命名，而不是为图标命名",
        })}
        lead={t({
          en: "Every slot renders its icon with aria-hidden, so an icon never names anything. The words beside it do, or an aria-label on an icon-only control. An icon you place in your own markup takes aria-hidden too.",
          zh: "每个插槽都以 aria-hidden 渲染图标，因此图标从不为任何东西命名。命名的是旁边的文字，或纯图标控件上的 aria-label。你在自己的标记中放置的图标同样要加上 aria-hidden。",
        })}
      >
        <SpecimenGrid>
          <Specimen
            caption={t({ en: "Button, icon only", zh: "Button，纯图标" })}
          >
            <Button
              icon={<TrashIcon weight="bold" />}
              aria-label={t({ en: "Delete", zh: "删除" })}
            />
          </Specimen>
        </SpecimenGrid>
        <GuideNote>
          <Anchor
            href={getLocalePath(
              "/design-system/foundations/accessibility",
              locale,
            )}
          >
            {t({
              en: "Which components need a name, and which prop takes it",
              zh: "哪些组件需要名称，由哪个属性提供",
            })}
          </Anchor>
        </GuideNote>
      </GuideSection>

      <Showcase
        label={t({ en: "A sample of the set", zh: "图标示例" })}
        breakout
      >
        <ShowcaseHelper>
          {t({
            en: "Each name is the one in the import path.",
            zh: "每个名称即导入路径中的名称。",
          })}{" "}
          <Anchor href="https://phosphoricons.com" target="_blank">
            {t({
              en: "Browse every icon at phosphoricons.com",
              zh: "在 phosphoricons.com 浏览全部图标",
            })}
          </Anchor>
        </ShowcaseHelper>
        <div css={styles.gallery}>
          {GALLERY.map(({ name, Icon }) => (
            <div key={name} css={[corner.radius_2, styles.galleryItem]}>
              <span css={styles.galleryIcon}>
                <Icon weight="bold" aria-hidden />
              </span>
              <span css={styles.galleryName}>
                <Identifier>{name}</Identifier>
              </span>
            </div>
          ))}
        </div>
      </Showcase>

      <Showcase label={t({ en: "Icon props", zh: "图标属性" })}>
        <ShowcaseHelper>
          {t({
            en: "These are Phosphor's props, not @tuja/ui's.",
            zh: "这些是 Phosphor 的属性，而非 @tuja/ui 的。",
          })}
        </ShowcaseHelper>
        <div css={styles.propGrid}>
          <SpecCard
            token="weight"
            meta='"thin" | "light" | "regular" | "bold" | "fill" | "duotone" = "regular"'
          >
            <p css={styles.propNote}>
              {t({
                en: "Stroke weight, or a solid or two-tone fill.",
                zh: "笔画粗细，或实心、双色填充。",
              })}
            </p>
          </SpecCard>
          <SpecCard token="size" meta='number | string = "1em"'>
            <p css={styles.propNote}>
              {t({
                en: "Leave it at 1em and set the font size on the parent.",
                zh: "保持 1em，在父元素上设置字号。",
              })}
            </p>
          </SpecCard>
          <SpecCard token="color" meta='string = "currentColor"'>
            <p css={styles.propNote}>
              {t({
                en: "Leave it at currentColor and set the colour on the parent.",
                zh: "保持 currentColor，在父元素上设置颜色。",
              })}
            </p>
          </SpecCard>
          <SpecCard token="mirrored" meta="boolean = false">
            <p css={styles.propNote}>
              {t({
                en: "Flips the icon horizontally, for right-to-left layouts.",
                zh: "水平翻转图标，用于从右到左的布局。",
              })}
            </p>
          </SpecCard>
          <SpecCard token="aria-hidden" meta="boolean">
            <p css={styles.propNote}>
              {t({
                en: "Hides the icon from assistive technology. Set it on any icon outside a slot.",
                zh: "对辅助技术隐藏图标。凡是不在插槽中的图标都要设置。",
              })}
            </p>
          </SpecCard>
        </div>
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  propGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))",
    gap: space._2,
  },
  propNote: {
    margin: 0,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.fgMuted,
    textWrap: "pretty",
  },
  gallery: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: space._2,
  },
  galleryItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._2,
    paddingBlock: space._3,
    paddingInline: space._2,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
    minInlineSize: 0,
  },
  galleryIcon: {
    display: "inline-flex",
    fontSize: font.uiHeading1,
    color: color.fg,
  },
  galleryName: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.fgMuted,
    lineHeight: font.lineHeight_2,
    textAlign: "center",
    maxInlineSize: "100%",
  },
  sizeRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: space._5,
    paddingBlock: space._3,
    paddingInline: space._3,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
  sizeItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._2,
    minInlineSize: 0,
  },
  sizeIcon: {
    display: "inline-flex",
    color: color.fgAccent,
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
    color: color.fgMuted,
  },
});
