import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import { GuideSection } from "#src/design-system/guide/guide-section.tsx";
import { RouteLinkCards } from "#src/design-system/guide/route-link-cards.tsx";
import type { DesignSystemPath } from "#src/design-system/routes/types.ts";
import { t } from "#src/i18n.ts";

const BLUR_LINKS: readonly { path: DesignSystemPath }[] = [
  { path: "/design-system/components/progressive-blur" },
  { path: "/design-system/components/scroll-mask" },
];

export function SurfacesFloatingElements() {
  const rules = [
    {
      term: t({
        en: "Blur, not a shadow or a scrim",
        zh: "虚化，而非阴影或遮罩",
      }),
      note: t({
        en: "MenuButton and Overlay put a ProgressiveBlur around what they float, strongest at its edge and fading out. popoverSurface casts no shadow, and Overlay's backdrop is invisible: it only catches the click that dismisses it.",
        zh: "MenuButton 与 Overlay 在它们悬浮的元素周围放一层 ProgressiveBlur，紧贴边缘处最强，向外逐渐消退。popoverSurface 不投阴影，Overlay 的背景层也不可见：它只接住用来关闭的那次点击。",
      }),
    },
    {
      term: t({ en: "The blur belongs to the page", zh: "虚化属于页面" }),
      note: t({
        en: "ProgressiveBlur filters the page behind the element; the element itself stays opaque. A translucent element that blurs its own background is Glass, which is a separate choice.",
        zh: "ProgressiveBlur 虚化的是元素背后的页面，元素本身保持不透明。半透明、虚化自身背景的元素是玻璃，那是另一个选择。",
      }),
    },
    {
      term: t({ en: "Popover does not blur", zh: "Popover 不虚化" }),
      note: t({
        en: "Popover paints popoverSurface and nothing around it. Wrap your own floating surface in ProgressiveBlur when it should match MenuButton instead.",
        zh: "Popover 只画 popoverSurface，周围什么也不加。如果你自己的悬浮表面要与 MenuButton 一致，就用 ProgressiveBlur 包住它。",
      }),
    },
  ];

  return (
    <GuideSection
      title={t({ en: "Floating surfaces", zh: "悬浮的表面" })}
      lead={t({
        en: "A menu or a dialog is set apart from the page by blurring the page around it. ProgressiveBlur draws that blur. ScrollMask draws the same kind of blur where a scroll region's content leaves view.",
        zh: "菜单或对话框靠虚化周围的页面来与页面区分。这层虚化由 ProgressiveBlur 绘制。ScrollMask 在滚动区域的内容离开视野处绘制同一类虚化。",
      })}
    >
      <GuideList items={rules} />
      <RouteLinkCards columns={2} links={BLUR_LINKS} />
    </GuideSection>
  );
}
