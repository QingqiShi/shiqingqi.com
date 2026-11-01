import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { Example } from "#src/design-system/example.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { Anchor } from "#src/links/anchor.tsx";

const IMPORT = `import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";`;

export function IconographyShowcase() {
  const locale = getLocale();

  return (
    <>
      <GuideSection
        title={t({
          en: "Pick an icon from Phosphor.",
          zh: "从 Phosphor 选图标。",
        })}
        lead={t({
          en: "The components draw their own icons with Phosphor, and yours come from the same set. Import each icon from its own file, so a page ships only the icons it uses.",
          zh: "组件自带的图标由 Phosphor 绘制，你的图标也取自同一套。每个图标从各自的文件导入，页面只会打包它用到的图标。",
        })}
      >
        <UsageSnippet code={IMPORT} />
        <GuideNote>
          {t({
            en: "Each icon lives at dist/ssr/Name and exports NameIcon.",
            zh: "每个图标位于 dist/ssr/Name，并导出 NameIcon。",
          })}{" "}
          <Anchor href="https://phosphoricons.com" target="_blank">
            {t({
              en: "Find an icon at phosphoricons.com",
              zh: "在 phosphoricons.com 查找图标",
            })}
          </Anchor>
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Let the slot or the text size it.",
          zh: "让插槽或文字决定图标大小。",
        })}
        lead={t({
          en: "A Phosphor icon is 1em square and drawn in currentColor, so never pass size or color. A slot sets both for you; anywhere else, the text around it does.",
          zh: "Phosphor 图标为 1em 见方，并以 currentColor 绘制，所以不要传入 size 或 color。插槽会替你设定这两者；在其他地方，由周围的文字决定。",
        })}
      >
        <Example>
          <Button icon={<PlusIcon weight="bold" />}>
            {t({ en: "Add to list", zh: "加入列表" })}
          </Button>
          <Text as="span" tone="muted" css={row.inline}>
            <ClockIcon weight="regular" aria-hidden />
            {t({ en: "Updated an hour ago", zh: "一小时前更新" })}
          </Text>
        </Example>
        <GuideNote>
          {t({
            en: "With no text beside it, give the parent a",
            zh: "旁边没有文字时，给父元素设置",
          })}{" "}
          <Anchor
            href={getLocalePath(
              "/design-system/foundations/typography",
              locale,
            )}
          >
            {t({ en: "type role", zh: "字体角色" })}
          </Anchor>
          {t({ en: ".", zh: "。" })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "The css prop works on HTML elements and @tuja/ui components, not on an icon: spread stylex.props.",
            zh: "css 属性只对 HTML 元素和 @tuja/ui 组件生效，对图标无效：请展开 stylex.props。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Draw it bold inside a control.",
          zh: "控件里的图标用粗体。",
        })}
        lead={t({
          en: "The package draws the carets, checks and close icons in its controls in bold. Phosphor draws regular when you name no weight, which looks thin beside them.",
          zh: "本包控件里的箭头、勾选与关闭图标都以粗体（bold）绘制。不写 weight 时，Phosphor 以常规（regular）绘制，放在它们旁边会显得太细。",
        })}
      >
        <div css={styles.pair}>
          <WeightSide
            mark={<CheckIcon weight="bold" aria-hidden />}
            verdict={t({
              en: "Bold, like the package's own glyphs.",
              zh: "粗体，与本包自己的图形一致。",
            })}
          >
            <Button size="lg" icon={<PlusIcon weight="bold" />}>
              {t({ en: "Add to list", zh: "加入列表" })}
            </Button>
          </WeightSide>
          <WeightSide
            mark={<XIcon weight="bold" aria-hidden />}
            verdict={t({
              en: "Regular, the default with no weight, looks thin.",
              zh: "常规，即不写 weight 时的默认值，显得太细。",
            })}
          >
            <Button size="lg" icon={<PlusIcon weight="regular" />}>
              {t({ en: "Add to list", zh: "加入列表" })}
            </Button>
          </WeightSide>
        </div>
        <GuideNote>
          {t({
            en: "Beside text the package mostly draws regular, as on the new-tab mark of a link.",
            zh: "在文字旁边，本包大多用常规，例如链接的新标签页标记。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "IconContext cannot set a default weight: dist/ssr ignores it, so name one on each icon.",
            zh: "IconContext 无法设定默认 weight：dist/ssr 不读取它，所以要在每个图标上写明。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Name the control, not the icon.",
          zh: "为控件命名，而不是为图标命名。",
        })}
        lead={t({
          en: "A slot hides its icon from screen readers, so the words beside it, or an aria-label on an icon-only control, give the name. Add aria-hidden yourself to an icon in your own markup.",
          zh: "插槽会对读屏软件隐藏图标，名称来自旁边的文字，或纯图标控件上的 aria-label。你在自己的标记中放置的图标，请自行加上 aria-hidden。",
        })}
      >
        <Example>
          <Button
            icon={<TrashIcon weight="bold" />}
            aria-label={t({ en: "Delete", zh: "删除" })}
          />
        </Example>
        <GuideNote>
          {t({
            en: "NavLink and NavGroup do not hide their icon: add aria-hidden.",
            zh: "NavLink 与 NavGroup 不会隐藏图标，请加上 aria-hidden。",
          })}{" "}
          <Anchor
            href={getLocalePath(
              "/design-system/foundations/accessibility",
              locale,
            )}
          >
            {t({
              en: "Which components need a name",
              zh: "哪些组件需要名称",
            })}
          </Anchor>
        </GuideNote>
      </GuideSection>
    </>
  );
}

interface WeightSideProps {
  mark: ReactNode;
  verdict: string;
  children: ReactNode;
}

function WeightSide({ mark, verdict, children }: WeightSideProps) {
  return (
    <figure css={[stack.item, styles.side]}>
      <div>{children}</div>
      <figcaption css={[typeRole.bodySmall, styles.verdict]}>
        <span css={styles.mark}>{mark}</span> {verdict}
      </figcaption>
    </figure>
  );
}

const styles = stylex.create({
  pair: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: rhythm.group,
  },
  side: {
    margin: 0,
    minInlineSize: 0,
  },
  verdict: {
    color: color.fgMuted,
  },
  mark: {
    display: "inline-block",
    verticalAlign: "-0.125em",
  },
});
