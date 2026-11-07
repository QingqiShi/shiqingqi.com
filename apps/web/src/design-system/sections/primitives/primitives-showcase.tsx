import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { A11ySection, ResetSection } from "./a11y-section.tsx";
import { ApiGrid, type ApiEntry } from "./api-grid.tsx";
import { CornerSection } from "./corner-section.tsx";
import { FlexSection } from "./flex-section.tsx";
import { LayoutSection } from "./layout-section.tsx";
import { MotionSection } from "./motion-section.tsx";
import { primitivesSpecimen } from "./primitives-specimen.stylex.ts";
import {
  MarkedSelectedSpecimen,
  QuietSelectedSpecimen,
} from "./selected-specimens.tsx";
import { StackSection } from "./stack-section.tsx";
import { TextureSection, WashSection } from "./texture-section.tsx";
import { TypeRoleSection } from "./type-role-section.tsx";

function RootSection() {
  const api: ApiEntry[] = [
    {
      token: "root.html",
      meta: "color-scheme · bg · text-size-adjust · latinType",
      description: t({
        en: "Turns on both colour schemes, paints the canvas and stops a phone from enlarging text. It sets no font size, so the visitor's own font size reaches every rem token. On a Chinese page it sets the latinType tokens back to plain values: no tracking, and the heading and display leading for Han characters.",
        zh: "开启两种配色方案、绘制画布，并阻止手机自动放大文字。它不设置字号，因此访客自己的字号设置能作用于每个 rem 令牌。在中文页面上，它把 latinType 令牌恢复为普通值：不加字距，标题与展示文字使用适合汉字的行高。",
      }),
    },
    {
      token: "root.body",
      meta: "color · font-family · line-height · letter-spacing · text-wrap · overflow-wrap",
      description: t({
        en: "The text every element inherits: the default colour, the typeface, a line height of 1.5, a tracking of 0.02em, text-wrap: pretty, and overflow-wrap: break-word, which breaks a word too long for its line.",
        zh: "每个元素继承的文字样式：默认颜色、字体、1.5 的行高、0.02em 的字距、text-wrap: pretty，以及 overflow-wrap: break-word，它会断开一行放不下的长词。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Root", zh: "根元素" })}>
      <ShowcaseHelper>
        {t({
          en: "The defaults for the whole document, set once. Text you style yourself then needs no line height or wrap of its own unless it differs.",
          zh: "整个文档的默认样式，只需设置一次。之后你自己设置样式的文字，除非需要不同的效果，否则无需再设行高或换行方式。",
        })}
      </ShowcaseHelper>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { root } from "@tuja/ui/primitives/root.stylex";

<html lang="en" css={root.html}>
  <body css={root.body}>{children}</body>
</html>`}
      />
    </Showcase>
  );
}

function SelectedSection() {
  const api: ApiEntry[] = [
    {
      token: "selected.marked",
      meta: "borderAccent · bgAccentSubtle · hover",
      description: t({
        en: "The accent border and tint, for a choice that decides what the visitor does next. Give the element a border width.",
        zh: "强调色边框与浅色底，用于决定访客下一步的选择。请为元素设置边框宽度。",
      }),
    },
    {
      token: "selectedTokens.rest",
      meta: "default: transparent",
      description: t({
        en: "The background while the item is not selected. selected.marked and quietSurface.interactive set backgroundColor, so set the rest colour through this token, not on the element.",
        zh: "条目未选中时的背景。selected.marked 和 quietSurface.interactive 都会设置 backgroundColor，因此请通过这个令牌设置静态颜色，而不是在元素上设置。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Selected", zh: "选中态" })}>
      <ShowcaseHelper>
        {t({
          en: "One selected state, read from the ARIA state the item already carries: aria-pressed, aria-checked or aria-selected set to true, or any aria-current. Set the attribute and the look follows, so what a screen reader announces is what everyone sees. An item that only has to stand out from its siblings takes quietSurface.interactive; a choice the visitor submits takes selected.marked.",
          zh: "统一的选中态，读取条目本身已有的 ARIA 状态：值为 true 的 aria-pressed、aria-checked 或 aria-selected，或任何 aria-current。设置属性，外观随之改变，因此屏幕阅读器读出的状态，就是所有人看到的状态。只需在同级中突出的条目使用 quietSurface.interactive；访客要提交的选择使用 selected.marked。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={primitivesSpecimen.tracks}>
        <Specimen
          caption={t({
            en: "A background, for a segmented choice",
            zh: "背景，用于分段选项",
          })}
          token="quietSurface.interactive"
        >
          <QuietSelectedSpecimen />
        </Specimen>
        <Specimen
          caption={t({
            en: "A border and a tint, for a picked plan",
            zh: "边框与浅色底，用于选中的方案",
          })}
          token="selected.marked"
        >
          <MarkedSelectedSpecimen />
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { selected } from "@tuja/ui/primitives/selected.stylex";

<button
  role="radio"
  aria-checked={isPicked}
  css={[styles.option, selected.marked]}
>
  {label}
</button>`}
      />
    </Showcase>
  );
}

function QuietSurfaceSection() {
  const api: ApiEntry[] = [
    {
      token: "quietSurface.interactive",
      meta: "hover · press · selected · focus",
      description: t({
        en: "Every state of a link or button with no fill of its own, with the selected state read from its ARIA state. Compose it after buttonReset.base, and put your own styles after it.",
        zh: "没有自身底色的链接或按钮的全部状态，选中态读取自它的 ARIA 状态。请放在 buttonReset.base 之后，并把你自己的样式放在它之后。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Quiet surface", zh: "安静表面" })}>
      <ShowcaseHelper>
        {t({
          en: "A link or button that fills only under the pointer, such as a row of a list, a menu item or a bare icon button. The radius and the padding stay with you, because rows differ.",
          zh: "只在指针之下才填充的链接或按钮，例如列表的一行、菜单项或无底色的图标按钮。圆角和内边距由你决定，因为每种行都不一样。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={primitivesSpecimen.tracks}>
        <Specimen
          caption={t({
            en: "Hover and press a row; the current one stays filled",
            zh: "悬停或按住某一行；当前行保持填充",
          })}
          token="quietSurface.interactive"
        >
          <ul css={[stack.rows, styles.quietRows]}>
            <li>
              <a
                href="#"
                css={[
                  typeRole.label,
                  a11y.touchRow,
                  corner.radius_2,
                  quietSurface.interactive,
                  styles.quietRow,
                ]}
              >
                {t({ en: "Overview", zh: "概览" })}
              </a>
            </li>
            <li>
              <a
                href="#"
                aria-current="page"
                css={[
                  typeRole.label,
                  a11y.touchRow,
                  corner.radius_2,
                  quietSurface.interactive,
                  styles.quietRow,
                ]}
              >
                {t({ en: "Activity", zh: "动态" })}
              </a>
            </li>
          </ul>
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";

<a href={href} css={[corner.radius_2, quietSurface.interactive, styles.row]}>
  {label}
</a>`}
      />
    </Showcase>
  );
}

export function PrimitivesShowcase() {
  return (
    <>
      <FlexSection />
      <LayoutSection />
      <MotionSection />
      <ResetSection />
      <RootSection />
      <CornerSection />
      <TextureSection />
      <WashSection />
      <A11ySection />
      <SelectedSection />
      <QuietSurfaceSection />
      <StackSection />
      <TypeRoleSection />
    </>
  );
}

const styles = stylex.create({
  quietRows: {
    inlineSize: "100%",
    maxInlineSize: "16rem",
  },
  quietRow: {
    display: "flex",
    alignItems: "center",
    paddingBlock: space._1,
    paddingInline: space._2,
  },
});
