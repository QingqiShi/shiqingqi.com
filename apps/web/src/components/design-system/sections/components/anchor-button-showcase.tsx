import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import * as stylex from "@stylexjs/stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Button } from "@tuja/ui/components/button";
import { space } from "@tuja/ui/tokens.stylex";
import { AnchorButton as RouterAnchorButton } from "#src/components/shared/anchor-button.tsx";
import { getLocale } from "#src/i18n/server-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath } from "#src/utils/get-locale-path.ts";
import { DoDont } from "../../do-dont.tsx";
import { GuideList } from "../../guide/guide-list.tsx";
import { GuideNote, GuideSection } from "../../guide/guide-section.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";

/** A placeholder destination: the specimens illustrate, they don't navigate. */
const HREF = "#";

export function AnchorButtonShowcase() {
  const locale = getLocale();
  const homeLabel = t({ en: "Home", zh: "首页" });
  const backLabel = t({ en: "Back", zh: "返回" });

  return (
    <>
      <Showcase label={t({ en: "Looks", zh: "外观" })}>
        <SpecimenGrid>
          <Specimen caption="default">
            <AnchorButton href={HREF}>
              {t({ en: "Default", zh: "默认" })}
            </AnchorButton>
          </Specimen>
          <Specimen caption="primary">
            <AnchorButton href={HREF} look="primary">
              {t({ en: "Primary", zh: "主要" })}
            </AnchorButton>
          </Specimen>
          <Specimen caption="outline">
            <AnchorButton href={HREF} look="outline">
              {t({ en: "Outline", zh: "描边" })}
            </AnchorButton>
          </Specimen>
          <Specimen caption="ghost">
            <AnchorButton href={HREF} look="ghost">
              {t({ en: "Ghost", zh: "无框" })}
            </AnchorButton>
          </Specimen>
          <Specimen caption="isActive">
            <AnchorButton href={HREF} isActive>
              {t({ en: "Current", zh: "当前" })}
            </AnchorButton>
          </Specimen>
          <Specimen caption="bright">
            <AnchorButton href={HREF} bright>
              {t({ en: "Bright", zh: "明亮" })}
            </AnchorButton>
          </Specimen>
        </SpecimenGrid>
        <ShowcaseHelper>
          {t({
            en: 'The looks are Button\'s own, drawn from the same styles rather than copied. isActive marks the destination the visitor is already on and emits aria-current="true"; a link is a destination, not a toggle, so it never emits aria-pressed.',
            zh: '这些外观就是 Button 的外观，源自同一套样式而非复制而来。isActive 标记访客当前所在的目标，并发出 aria-current="true"；链接是目标而不是切换控件，因此它绝不会发出 aria-pressed。',
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="sm">
            <div css={styles.pair}>
              <AnchorButton href={HREF} size="sm">
                {t({ en: "Link", zh: "链接" })}
              </AnchorButton>
              <Button size="sm">{t({ en: "Button", zh: "按钮" })}</Button>
            </div>
          </Specimen>
          <Specimen caption="md">
            <div css={styles.pair}>
              <AnchorButton href={HREF} size="md">
                {t({ en: "Link", zh: "链接" })}
              </AnchorButton>
              <Button size="md">{t({ en: "Button", zh: "按钮" })}</Button>
            </div>
          </Specimen>
          <Specimen caption="lg">
            <div css={styles.pair}>
              <AnchorButton href={HREF} size="lg">
                {t({ en: "Link", zh: "链接" })}
              </AnchorButton>
              <Button size="lg">{t({ en: "Button", zh: "按钮" })}</Button>
            </div>
          </Specimen>
        </SpecimenGrid>
        <ShowcaseHelper>
          {t({
            en: "One size scale, shared with Button: at the same size the two stand the same height, so a link and a button sit level in the same row of controls.",
            zh: "与 Button 共用同一套尺寸阶梯：同一尺寸下两者高度相同，因此同一行控件中的链接与按钮能够对齐。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "With icon", zh: "带图标" })}>
        <SpecimenGrid>
          <Specimen caption="leading icon">
            <AnchorButton href={HREF} icon={<CaretLeftIcon weight="bold" />}>
              {backLabel}
            </AnchorButton>
          </Specimen>
          <Specimen caption="primary + icon">
            <AnchorButton
              href={HREF}
              look="primary"
              icon={<ArrowRightIcon weight="bold" />}
            >
              {t({ en: "Browse films", zh: "浏览影片" })}
            </AnchorButton>
          </Specimen>
          <Specimen caption="icon-only">
            <AnchorButton
              href={HREF}
              icon={<HouseIcon weight="bold" />}
              aria-label={homeLabel}
            />
          </Specimen>
        </SpecimenGrid>
        <ShowcaseHelper>
          {t({
            en: "With no children the link renders icon-only: a square of its own height, named by aria-label or aria-labelledby, since the icon itself is decorative. hideLabelOnMobile keeps the label from md up and collapses to the same square below it.",
            zh: "没有 children 时，链接渲染为纯图标：一个与自身高度相等的正方形，由 aria-label 或 aria-labelledby 命名，因为图标本身是装饰性的。hideLabelOnMobile 会在 md 及以上保留标签，并在其以下收起为同样的正方形。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "Link Slot", zh: "链接插槽" })}>
        <Specimen caption="linkComponent">
          <RouterAnchorButton href={getLocalePath("/design-system", locale)}>
            {t({ en: "Design system", zh: "设计系统" })}
          </RouterAnchorButton>
        </Specimen>
        <ShowcaseHelper>
          {t({
            en: "The package depends on no framework, so the anchor itself is a Slot. The default is a plain <a>, which reloads the page; pass the framework's link — this example uses next/link — to keep navigation client-side. The Slot has to forward everything it is handed onto its anchor: className and style carry the look, and the ref and the event handlers carry the press animation.",
            zh: "该包不依赖任何框架，因此锚点本身就是一个插槽。默认是原生 <a>，会触发整页刷新；传入框架自带的链接组件——这里是 next/link——即可保留客户端导航。插槽必须把收到的一切都转发到锚点上：className 与 style 承载外观，ref 与事件处理函数承载按压动画。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <PropsTable component="anchor-button" />

      <GuideSection
        title={t({ en: "When to use", zh: "何时使用" })}
        lead={t({
          en: "Reach for it when the action is going somewhere. Everything else on the page that acts on the page itself is a Button.",
          zh: "当这个操作的结果是跳转到别处时使用它。页面上其他作用于页面自身的操作，一律用 Button。",
        })}
      >
        <DoDont
          do={
            <AnchorButton href={HREF} icon={<CaretLeftIcon weight="bold" />}>
              {t({ en: "Back to films", zh: "返回影片" })}
            </AnchorButton>
          }
          doCaption={t({
            en: "A destination renders an <a>, so it keeps the link role, the new tab and the context menu.",
            zh: "目标链接渲染为 <a>，因此保留链接角色、新标签页与右键菜单。",
          })}
          dont={
            <Button icon={<CaretLeftIcon weight="bold" />}>
              {t({ en: "Back to films", zh: "返回影片" })}
            </Button>
          }
          dontCaption={t({
            en: "Don't send a visitor somewhere with a Button — it renders a <button>, and the destination loses all three.",
            zh: "不要用 Button 把访客送往别处——它渲染的是 <button>，上述三样都会失去。",
          })}
        />
        <GuideNote>
          {t({
            en: "There is no loading and no disabled. A link either has a destination or it is not a link; an action that can be busy or blocked is a Button.",
            zh: "它没有 loading，也没有 disabled。链接要么有目标地址，要么就不是链接；会进入忙碌或被阻止的操作属于 Button。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Accessibility", zh: "无障碍" })}
        lead={t({
          en: "Every link needs a name and a destination, and the one the visitor is already on should say so.",
          zh: "每个链接都需要名称与目标地址，而访客当前所在的那一个应当说明这一点。",
        })}
      >
        <GuideList
          items={[
            {
              term: t({ en: "Icon-only", zh: "纯图标" }),
              value: "aria-label",
              note: t({
                en: "With no children, aria-label or aria-labelledby is required at the type level, so an unnamed icon-only link does not compile.",
                zh: "没有 children 时，类型层面强制要求 aria-label 或 aria-labelledby，因此无名的纯图标链接无法通过编译。",
              }),
            },
            {
              term: t({ en: "Current page", zh: "当前页面" }),
              value: "isActive",
              note: t({
                en: 'isActive emits aria-current="true" and paints the highlight. For a link that only wants the highlight, use look="primary".',
                zh: 'isActive 会发出 aria-current="true" 并绘制高亮。若只需要高亮，改用 look="primary"。',
              }),
            },
            {
              term: t({ en: "Destination", zh: "目标地址" }),
              value: "href",
              note: t({
                en: "Required. Without it the element has no link role, so neither the keyboard nor a screen reader treats it as somewhere to go.",
                zh: "必填。没有它元素就没有链接角色，键盘与屏幕阅读器都不会把它当作可前往的目标。",
              }),
            },
          ]}
        />
      </GuideSection>
    </>
  );
}

const styles = stylex.create({
  pair: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
  },
});
