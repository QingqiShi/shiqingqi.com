import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BookmarkIcon } from "@phosphor-icons/react/dist/ssr/Bookmark";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { t } from "@tuja/i18n";
import { Anchor } from "@tuja/ui/components/anchor";
import { Button } from "@tuja/ui/components/button";
import { MetaLine } from "@tuja/ui/components/meta-line";
import {
  outlineSurface,
  outlineSurfaceSize,
} from "@tuja/ui/components/outline-surface.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { align } from "@tuja/ui/primitives/flex.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { Example } from "#src/design-system/example.tsx";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";

const LINK_PROVIDER = `import { LinkProvider } from "@tuja/ui/components/link-provider";
import NextLink from "next/link";

<LinkProvider linkComponent={NextLink}>{children}</LinkProvider>`;

export function ButtonShowcase() {
  const searchLabel = t({ en: "Search", zh: "搜索" });
  const deleteLabel = t({ en: "Delete", zh: "删除" });

  return (
    <>
      <Showcase label={t({ en: "Looks", zh: "外观" })}>
        <SpecimenGrid>
          <Specimen caption="default">
            <Button>{t({ en: "Default", zh: "默认" })}</Button>
          </Specimen>
          <Specimen caption="primary">
            <Button look="primary">{t({ en: "Primary", zh: "主要" })}</Button>
          </Specimen>
          <Specimen caption="outline">
            <Button look="outline">{t({ en: "Outline", zh: "描边" })}</Button>
          </Specimen>
          <Specimen caption="ghost">
            <Button look="ghost">{t({ en: "Ghost", zh: "无框" })}</Button>
          </Specimen>
          <Specimen caption="danger">
            <Button look="danger" icon={<TrashIcon weight="bold" />}>
              {t({ en: "Delete", zh: "删除" })}
            </Button>
          </Specimen>
          <Specimen caption='outline + intent="danger"'>
            <Button look="outline" intent="danger">
              {t({ en: "Delete", zh: "删除" })}
            </Button>
          </Specimen>
          <Specimen caption='ghost + intent="danger"'>
            <Button look="ghost" intent="danger">
              {t({ en: "Delete", zh: "删除" })}
            </Button>
          </Specimen>
          <Specimen caption="active">
            <Button isActive>{t({ en: "Active", zh: "激活" })}</Button>
          </Specimen>
          <Specimen caption="bright">
            <Button look="bright">{t({ en: "Bright", zh: "明亮" })}</Button>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase
        label={t({
          en: "A link is a Button with an href",
          zh: "链接是带 href 的 Button",
        })}
      >
        <SpecimenGrid>
          <Specimen caption="href">
            <Button href="#" icon={<CaretLeftIcon weight="bold" />}>
              {t({ en: "Back to films", zh: "返回影片" })}
            </Button>
          </Specimen>
          <Specimen caption="href + primary">
            <Button
              href="#"
              look="primary"
              icon={<ArrowRightIcon weight="bold" />}
            >
              {t({ en: "Browse films", zh: "浏览影片" })}
            </Button>
          </Specimen>
          <Specimen caption="href + isActive">
            <Button href="#" isActive>
              {t({ en: "Current", zh: "当前" })}
            </Button>
          </Specimen>
        </SpecimenGrid>
        <ShowcaseHelper>
          {t({
            en: 'With href the Button renders an <a>, so it keeps the link role, the new tab and the context menu. isActive then emits aria-current="true", not aria-pressed. target, rel and download belong to this form, and type, disabled and loading do not compile with it.',
            zh: '有 href 时 Button 渲染为 <a>，因此保留链接角色、新标签页与右键菜单。此时 isActive 发出 aria-current="true"，而不是 aria-pressed。target、rel 与 download 属于这种形态，type、disabled 与 loading 与它同用无法通过编译。',
          })}
        </ShowcaseHelper>
        <UsageSnippet
          code={LINK_PROVIDER}
          label={t({ en: "At the root of the app", zh: "在应用的根部" })}
        />
        <ShowcaseHelper>
          {t({
            en: "The package depends on no framework, so a link is a plain <a> that reloads the page until the app sets its link once at the root. A single Button can pass its own linkComponent. Either one has to forward everything it is handed onto its anchor: className and style carry the look, and the ref and the event handlers carry the press animation.",
            zh: "该包不依赖任何框架，因此链接是会重新加载页面的原生 <a>，直到应用在根部统一设置链接组件。单个 Button 也可以传入自己的 linkComponent。两者都必须把收到的一切转发到锚点上：className 与 style 承载外观，ref 与事件处理函数承载按压动画。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase
        label={t({
          en: "A link in text is an Anchor",
          zh: "文字中的链接是 Anchor",
        })}
        leadsWithText
      >
        <ShowcaseHelper>
          {t({
            en: 'An Anchor stands out from the sentence around it. tone="muted" keeps the colour and weight of a line of details and marks the link with the underline only.',
            zh: 'Anchor 在周围的句子中显得突出。tone="muted" 保持详情行的颜色与字重，只用下划线标示链接。',
          })}
        </ShowcaseHelper>
        <Example>
          <div css={stack.tight}>
            <Text>
              {t({ en: "Read the ", zh: "请先阅读" })}
              <Anchor
                href="#"
                newTabLabel={t({
                  en: "(opens in new tab)",
                  zh: "(在新标签页中打开)",
                })}
              >
                {t({ en: "release notes", zh: "发布说明" })}
              </Anchor>
              {t({ en: " first.", zh: "。" })}
            </Text>
            <Text look="caption" tone="muted">
              <MetaLine
                facts={[
                  t({ en: "12 replies", zh: "12 条回复" }),
                  <Anchor
                    key="source"
                    href="#"
                    tone="muted"
                    newTabLabel={t({
                      en: "(opens in new tab)",
                      zh: "(在新标签页中打开)",
                    })}
                  >
                    {t({ en: "Source", zh: "来源" })}
                  </Anchor>,
                ]}
              />
            </Text>
            <Anchor
              href="#"
              standalone
              newTabLabel={t({
                en: "(opens in new tab)",
                zh: "(在新标签页中打开)",
              })}
            >
              {t({ en: "All films", zh: "全部影片" })}
            </Anchor>
          </div>
        </Example>
        <GuideNote>
          {t({
            en: "standalone gives a link outside a sentence a 44px hit area on touch, as a button has, and does not change its look. Leave it off in running text, where that area covers the lines above and below.",
            zh: "standalone 让句子之外的链接在触屏上获得与按钮一样的 44px 点击区域，外观不变。连续文字中的链接不要设置它，否则该区域会遮住上下行。",
          })}
        </GuideNote>
      </Showcase>

      <PropsTable component="anchor" />

      <Showcase label={t({ en: "A row of filters", zh: "一排筛选项" })}>
        <Example>
          <div css={cluster.tight}>
            <Button size="xs" look="outline" isActive>
              {t({ en: "Now playing", zh: "正在上映" })}
            </Button>
            <Button size="xs" look="outline">
              {t({ en: "Upcoming", zh: "即将上映" })}
            </Button>
            <Button
              size="xs"
              look="outline"
              icon={<BookmarkIcon weight="bold" />}
              trailing="12"
            >
              {t({ en: "Watchlist", zh: "待看清单" })}
            </Button>
            <select
              aria-label={t({ en: "Genre", zh: "类型" })}
              css={[
                typeRole.caption,
                outlineSurface.layout,
                outlineSurface.skin,
                outlineSurfaceSize.xs,
                corner.squircle_round,
                outlineSurface.interactive,
              ]}
            >
              <option>{t({ en: "Any genre", zh: "全部类型" })}</option>
              <option>{t({ en: "Drama", zh: "剧情" })}</option>
            </select>
          </div>
        </Example>
        <ShowcaseHelper>
          {t({
            en: 'A dense row takes size="xs" and look="outline". trailing stays in the accessibility tree, so it reads as part of the name, and on the selected fill it takes the label\'s colour to keep its contrast. A <select> cannot be a Button, so it takes outlineSurface, the same border, fill and selected state.',
            zh: '紧凑的一行使用 size="xs" 与 look="outline"。trailing 保留在无障碍树中，会作为名称的一部分被朗读；在选中态的填充上它改用标签的颜色，以保持对比度。<select> 不可能是 Button，因此使用 outlineSurface，它带有同样的描边、填充与选中态。',
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase
        label={t({ en: "Reach past the content edge", zh: "越过内容边缘" })}
      >
        <Example>
          <div css={[stack.tight, align.start]}>
            <Button
              size="sm"
              look="ghost"
              bleed="start"
              icon={<CaretLeftIcon weight="bold" />}
              href="#"
            >
              {t({ en: "All reports", zh: "全部晨报" })}
            </Button>
            <Text>
              {t({
                en: "The back link’s arrow lines up with this text.",
                zh: "返回链接的箭头与这段文字对齐。",
              })}
            </Text>
          </div>
        </Example>
        <ShowcaseHelper>
          {t({
            en: 'A ghost button has no fill at rest, so its padding reads as empty space. bleed="start" or bleed="end" pulls the box past the edge by that padding, and the label or glyph meets the edge of the text.',
            zh: 'ghost 按钮静止时没有填充，它的内边距看起来只是空白。bleed="start" 或 bleed="end" 让方框按这段内边距越过边缘，标签或图标便与文字的边缘对齐。',
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "Loading", zh: "加载中" })}>
        <SpecimenGrid>
          <Specimen caption="default">
            <Button loading>{t({ en: "Save", zh: "保存" })}</Button>
          </Specimen>
          <Specimen caption="primary">
            <Button look="primary" loading>
              {t({ en: "Continue", zh: "继续" })}
            </Button>
          </Specimen>
          <Specimen caption="outline">
            <Button look="outline" loading icon={<PlusIcon weight="bold" />}>
              {t({ en: "Add", zh: "添加" })}
            </Button>
          </Specimen>
        </SpecimenGrid>
        <ShowcaseHelper>
          {t({
            en: "The button keeps its width either way. With an icon the spinner takes the icon's place; without one it sits over the label, which stays in the layout reserving its space. Pointer events are off while busy, so a control that can't be used doesn't light up under the cursor.",
            zh: "两种情况下按钮宽度都保持不变。有图标时，加载指示器取代图标；没有图标时，它覆盖在标签之上，而标签仍留在布局中占据原有空间。忙碌期间指针事件被关闭，因此无法使用的控件不会在光标下产生响应。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="xs">
            <Button size="xs">{t({ en: "Extra small", zh: "特小" })}</Button>
          </Specimen>
          <Specimen caption="sm">
            <Button size="sm">{t({ en: "Small", zh: "小" })}</Button>
          </Specimen>
          <Specimen caption="md">
            <Button size="md">{t({ en: "Medium", zh: "中" })}</Button>
          </Specimen>
          <Specimen caption="lg">
            <Button size="lg">{t({ en: "Large", zh: "大" })}</Button>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "With icon", zh: "带图标" })}>
        <SpecimenGrid>
          <Specimen caption="leading icon">
            <Button icon={<PlusIcon weight="bold" />}>
              {t({ en: "Add", zh: "添加" })}
            </Button>
          </Specimen>
          <Specimen caption="primary + icon">
            <Button look="primary" icon={<ArrowRightIcon weight="bold" />}>
              {t({ en: "Continue", zh: "继续" })}
            </Button>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Icon-only", zh: "纯图标" })} leadsWithText>
        <ShowcaseHelper>
          {t({
            en: "With no children the button renders icon-only: a square of its own height, named by aria-label or aria-labelledby, since the icon itself is decorative. With no label beside it, the glyph is larger than a glyph beside a label, the size of a checkbox or a drag handle in the same row.",
            zh: "没有 children 时，按钮渲染为纯图标：一个与自身高度相等的正方形，由 aria-label 或 aria-labelledby 命名，因为图标本身是装饰性的。旁边没有标签时，图标比标签旁的图标更大，与同一行中的复选框或拖动手柄一样大。",
          })}
        </ShowcaseHelper>
        <SpecimenGrid>
          <Specimen caption="sm">
            <Button
              size="sm"
              icon={<MagnifyingGlassIcon weight="bold" />}
              aria-label={searchLabel}
            />
          </Specimen>
          <Specimen caption="md">
            <Button
              size="md"
              icon={<MagnifyingGlassIcon weight="bold" />}
              aria-label={searchLabel}
            />
          </Specimen>
          <Specimen caption="lg">
            <Button
              size="lg"
              icon={<MagnifyingGlassIcon weight="bold" />}
              aria-label={searchLabel}
            />
          </Specimen>
        </SpecimenGrid>
        <SpecimenGrid>
          <Specimen caption="default">
            <Button
              icon={<TrashIcon weight="bold" />}
              aria-label={deleteLabel}
            />
          </Specimen>
          <Specimen caption="ghost">
            <Button
              look="ghost"
              icon={<TrashIcon weight="bold" />}
              aria-label={deleteLabel}
            />
          </Specimen>
          <Specimen caption="outline">
            <Button
              look="outline"
              icon={<TrashIcon weight="bold" />}
              aria-label={deleteLabel}
            />
          </Specimen>
        </SpecimenGrid>
        <SpecimenGrid>
          <Specimen caption="enabled">
            <Button
              icon={<TrashIcon weight="bold" />}
              aria-label={deleteLabel}
            />
          </Specimen>
          <Specimen caption="disabled">
            <Button
              icon={<TrashIcon weight="bold" />}
              aria-label={deleteLabel}
              disabled
            />
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <Showcase label={t({ en: "Disabled", zh: "禁用" })}>
        <SpecimenGrid>
          <Specimen caption="default">
            <Button disabled>{t({ en: "Default", zh: "默认" })}</Button>
          </Specimen>
          <Specimen caption="primary">
            <Button look="primary" disabled>
              {t({ en: "Primary", zh: "主要" })}
            </Button>
          </Specimen>
        </SpecimenGrid>
      </Showcase>

      <PropsTable component="button" />

      <GuideSection
        title={t({ en: "Choosing a Look", zh: "如何选择外观" })}
        lead={t({
          en: "The Look is the button's weight on the screen, not its meaning. Read down until one line describes the action in hand.",
          zh: "外观决定按钮在页面上的分量，而不是它的含义。从上往下读，直到某一行正好描述手上的这个操作。",
        })}
      >
        <GuideList
          items={[
            {
              term: t({
                en: "The one action that carries the screen",
                zh: "承载整个页面的那一个操作",
              }),
              value: 'look="primary"',
              note: t({
                en: "The highlight that marks the page's main action. It shares isActive's highlight without emitting aria-pressed, so it stays a one-shot action rather than a state.",
                zh: "用高亮标出页面的主操作。它与 isActive 共用同一种高亮，但不会发出 aria-pressed，因此它始终是一次性操作而不是一种状态。",
              }),
            },
            {
              term: t({
                en: "A second action beside a primary one",
                zh: "primary 操作旁边的次要操作",
              }),
              value: t({ en: "no look", zh: "不设 look" }),
              note: t({
                en: "The default raised surface. Quieter than primary, and still a full control.",
                zh: "默认的凸起表面。比 primary 克制，但仍是一个完整的控件。",
              }),
            },
            {
              term: t({
                en: "An action inside a card or a row",
                zh: "卡片或行内部的操作",
              }),
              value: 'look="outline"',
              note: t({
                en: "A border in place of the fill, so a control on a surface of its own does not read as a card inside a card.",
                zh: "以描边取代填充，让位于自有表面上的控件不会读成卡片里的卡片。",
              }),
            },
            {
              term: t({
                en: "An affordance over existing content",
                zh: "叠在已有内容之上的行内控件",
              }),
              value: 'look="ghost"',
              note: t({
                en: "No surface at all, and the colour is held back until hover or focus.",
                zh: "完全没有表面，颜色在悬停或获得焦点前保持克制。",
              }),
            },
            {
              term: t({
                en: "A button on a dark or tinted surface",
                zh: "位于深色或着色表面上的按钮",
              }),
              value: 'look="bright"',
              note: t({
                en: "A bright surface that stays light in both themes and brightens further on hover.",
                zh: "在两种主题下都保持浅色的明亮表面，悬停时进一步提亮。",
              }),
            },
            {
              term: t({
                en: "An action that destroys something",
                zh: "具有破坏性的操作",
              }),
              value: 'look="danger"',
              note: t({
                en: "Reserved for what cannot be undone — deleting, discarding, revoking.",
                zh: "只留给无法撤销的操作——删除、丢弃、撤回。",
              }),
            },
            {
              term: t({
                en: "A destructive action among others, such as Delete in a bar",
                zh: "与其他操作并列的破坏性操作，例如操作栏中的“删除”",
              }),
              value: 'intent="danger"',
              note: t({
                en: "On an outline or ghost button. The label turns danger and the button keeps the weight of its neighbours.",
                zh: "用于 outline 或 ghost 按钮。标签变为危险色，按钮与相邻按钮保持同样的分量。",
              }),
            },
          ]}
        />
      </GuideSection>

      <GuideSection
        title={t({ en: "Accessibility", zh: "无障碍" })}
        lead={t({
          en: "Every button needs a name, a button that is busy still has to be reachable, and the ARIA follows the element.",
          zh: "每个按钮都需要名称，处于忙碌状态的按钮仍然必须可达，ARIA 则跟随元素。",
        })}
      >
        <GuideList
          items={[
            {
              term: t({ en: "Icon-only", zh: "纯图标" }),
              value: "aria-label",
              note: t({
                en: "With no children, aria-label or aria-labelledby is required at the type level, so an unnamed icon-only button does not compile.",
                zh: "没有 children 时，类型层面强制要求 aria-label 或 aria-labelledby，因此无名的纯图标按钮无法通过编译。",
              }),
            },
            {
              term: t({ en: "Busy", zh: "忙碌" }),
              value: "loading",
              note: t({
                en: "loading sets aria-busy and blocks activation through aria-disabled rather than the native disabled attribute, so the button keeps focus and the busy state is announced.",
                zh: "loading 会设置 aria-busy，并以 aria-disabled 而非原生 disabled 属性阻止触发，因此按钮保留焦点，忙碌状态也能被读出。",
              }),
            },
            {
              term: t({ en: "Toggle", zh: "切换" }),
              value: "isActive",
              note: t({
                en: 'isActive emits aria-pressed. look="primary" carries the same highlight with no state, so a toggle belongs to isActive alone.',
                zh: 'isActive 会发出 aria-pressed。look="primary" 只有同样的高亮而没有状态，因此切换状态只交给 isActive。',
              }),
            },
            {
              term: t({ en: "Current page", zh: "当前页面" }),
              value: "href + isActive",
              note: t({
                en: 'On a link, isActive emits aria-current="true", because a link is a destination and not a toggle.',
                zh: '在链接上，isActive 发出 aria-current="true"，因为链接是目标而不是切换控件。',
              }),
            },
          ]}
        />
      </GuideSection>
    </>
  );
}
