import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/ssr/FloppyDisk";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, controlSize, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { GuideList } from "../../guide/guide-list.tsx";
import { GuideNote, GuideSection } from "../../guide/guide-section.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";

export function ButtonShowcase() {
  const searchLabel = t({ en: "Search", zh: "搜索" });
  const deleteLabel = t({ en: "Delete", zh: "删除" });
  const closeLabel = t({ en: "Close", zh: "关闭" });

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
          <Specimen caption="active">
            <Button isActive>{t({ en: "Active", zh: "激活" })}</Button>
          </Specimen>
          <Specimen caption="bright">
            <Button bright>{t({ en: "Bright", zh: "明亮" })}</Button>
          </Specimen>
        </SpecimenGrid>
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

      <Showcase label={t({ en: "Icon-only", zh: "纯图标" })}>
        <ShowcaseHelper>
          {t({
            en: "With no children the button renders icon-only: a square of its own height, at the corner radius half that height gives — named by aria-label or aria-labelledby, since the icon itself is decorative.",
            zh: "没有 children 时，按钮渲染为纯图标：一个与自身高度相等的正方形，圆角为该高度的一半——由 aria-label 或 aria-labelledby 命名，因为图标本身是装饰性的。",
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
        <DoDont
          do={<Button icon={<XIcon weight="bold" />} aria-label={closeLabel} />}
          doCaption={t({
            en: "Name an icon-only button with aria-label — required at the type level, so it cannot ship silent.",
            zh: "为纯图标按钮提供 aria-label——类型层面强制要求，因此它不可能在无名状态下发布。",
          })}
          dont={
            <div css={styles.dontGroup}>
              {/* A drawing of the mistake, not the mistake itself: a real
                  icon-only Button here would refuse to compile without an
                  aria-label. */}
              <span css={[corner.radius_2, styles.fauxIconOnly]} aria-hidden>
                <FloppyDiskIcon weight="bold" />
              </span>
              <Text look="bodySmall" tone="muted">
                {t({ en: "Save changes", zh: "保存更改" })}
              </Text>
            </div>
          }
          dontCaption={t({
            en: "Don't rely on nearby visible text as the only name — a screen reader never associates it with the button the way aria-label or aria-labelledby does.",
            zh: "不要仅依赖旁边的可见文字充当唯一名称——屏幕阅读器不会像 aria-label 或 aria-labelledby 那样把它与按钮关联起来。",
          })}
        />
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
        title={t({ en: "When to use", zh: "何时使用" })}
        lead={t({
          en: "A Button is for an action taken on the page it sits on. One action carries the screen, and everything beside it steps back.",
          zh: "按钮用于在其所在页面上执行的操作。一个操作承载整个页面，它旁边的其他操作都要退后。",
        })}
      >
        <DoDont
          do={
            <>
              <Button look="primary">
                {t({ en: "Save changes", zh: "保存更改" })}
              </Button>
              <Button>{t({ en: "Cancel", zh: "取消" })}</Button>
            </>
          }
          doCaption={t({
            en: "One primary action per screen, with everything beside it on the default raised look.",
            zh: "每个页面只留一个 primary 操作，旁边的其他操作都使用默认的凸起外观。",
          })}
          dont={
            <>
              <Button look="primary">
                {t({ en: "Save changes", zh: "保存更改" })}
              </Button>
              <Button look="primary">
                {t({ en: "Save and close", zh: "保存并关闭" })}
              </Button>
            </>
          }
          dontCaption={t({
            en: "Don't give two actions the same weight — a screen with two primary buttons has none.",
            zh: "不要让两个操作同等醒目——一个页面出现两个 primary 按钮，等于一个都没有。",
          })}
        />
        <DoDont
          do={
            <Button look="danger" icon={<TrashIcon weight="bold" />}>
              {t({ en: "Delete account", zh: "删除账户" })}
            </Button>
          }
          doCaption={t({
            en: "danger is for the action that destroys something.",
            zh: "danger 用于真正具有破坏性的操作。",
          })}
          dont={
            <Button look="danger" icon={<FloppyDiskIcon weight="bold" />}>
              {t({ en: "Save changes", zh: "保存更改" })}
            </Button>
          }
          dontCaption={t({
            en: "Don't spend the colour on an ordinary action — an Intent colour appears only where it changes what the visitor does next.",
            zh: "不要把这种颜色花在普通操作上——意图色只出现在会改变访客下一步的地方。",
          })}
        />
        <DoDont
          do={
            <Button icon={<FloppyDiskIcon weight="bold" />}>
              {t({ en: "Save draft", zh: "保存草稿" })}
            </Button>
          }
          doCaption={t({
            en: "The label names what the action does on this page.",
            zh: "标签写出该操作在当前页面会做什么。",
          })}
          dont={<Button>{t({ en: "Back to films", zh: "返回影片" })}</Button>}
          dontCaption={t({
            en: "Don't use a Button to go somewhere. It renders a <button>, so a destination loses the link role, the new tab and the context menu.",
            zh: "不要用按钮跳转到别处。它渲染的是 <button>，目的地会因此失去链接角色、新标签页与右键菜单。",
          })}
        />
      </GuideSection>

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
                en: "An action that destroys something",
                zh: "具有破坏性的操作",
              }),
              value: 'look="danger"',
              note: t({
                en: "Reserved for what cannot be undone — deleting, discarding, revoking.",
                zh: "只留给无法撤销的操作——删除、丢弃、撤回。",
              }),
            },
          ]}
        />
        <GuideNote>
          {t({
            en: "bright is not a Look: it lifts the button onto a bright surface and overrides the fill, so pairing it with outline or ghost cancels their chrome.",
            zh: "bright 不是一种外观：它把按钮置于明亮表面并覆盖填充，因此与 outline 或 ghost 同用会抵消二者的外框处理。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Accessibility", zh: "无障碍" })}
        lead={t({
          en: "Every button needs a name, and a button that is busy still has to be reachable.",
          zh: "每个按钮都需要名称，而处于忙碌状态的按钮仍然必须可达。",
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
          ]}
        />
        <DoDont
          do={
            <Button
              icon={<TrashIcon weight="bold" />}
              aria-label={t({ en: "Delete", zh: "删除" })}
            />
          }
          doCaption={t({
            en: "Pass the icon through icon and name an icon-only button with aria-label.",
            zh: "通过 icon 传入图标，并用 aria-label 为纯图标按钮命名。",
          })}
          dont={
            <Button>
              <TrashIcon weight="bold" />
            </Button>
          }
          dontCaption={t({
            en: "Don't put a bare icon in children — the button then ships with no accessible name.",
            zh: "不要把裸图标直接放进 children——这样按钮会缺少可访问名称。",
          })}
        />
      </GuideSection>
    </>
  );
}

const styles = stylex.create({
  dontGroup: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
  },
  // Sized and coloured like the real icon-only Button it stands in for.
  fauxIconOnly: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
    fontSize: font.uiHeading3,
    color: color.textMuted,
    backgroundColor: color.bgInteractiveRest,
  },
});
