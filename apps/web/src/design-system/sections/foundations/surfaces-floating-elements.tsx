import { t } from "@tuja/i18n";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { DocLink } from "#src/design-system/guide/doc-link.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { SurfacesFloatingMenu } from "#src/design-system/sections/foundations/surfaces-floating-menu.tsx";

export function SurfacesFloatingElements() {
  return (
    <GuideSection
      title={t({
        en: "Float by changing the page, not the shadow.",
        zh: "悬浮靠改变页面，而不是加深阴影。",
      })}
      lead={t({
        en: "A floating surface sets itself apart by changing the page under it. The more of the page it blocks, the stronger the change.",
        zh: "悬浮的表面靠改变下方的页面与之区分开来。它挡住的页面越多，改变就越大。",
      })}
    >
      <SurfacesFloatingMenu />
      <div css={stack.tight}>
        <GuideNote>
          {t({
            en: "A Sheet blocks the whole page, so it dims all of it with color.bgScrim.",
            zh: "Sheet 挡住整个页面，所以用 color.bgScrim 把整个页面压暗。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Popover adds nothing. To match MenuButton, wrap your surface in ",
            zh: "Popover 什么也不加。要与 MenuButton 一致，就用",
          })}
          <DocLink path="/design-system/components/progressive-blur" />
          {t({ en: ".", zh: "包住你自己的表面。" })}
        </GuideNote>
      </div>
    </GuideSection>
  );
}
