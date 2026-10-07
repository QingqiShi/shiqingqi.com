import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { Identifier } from "#src/design-system/identifier.tsx";
import { measure } from "#src/design-system/measure.stylex.ts";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";
import { ContainerScaleSpecimen } from "./container-scale-specimen.tsx";
import { ViewportScaleSpecimen } from "./viewport-scale-specimen.tsx";

type TypeRoleName = keyof typeof typeRole;

interface RoleRow {
  name: TypeRoleName;
  /** Size · line height · weight · tracking. */
  meta: string;
  /** The component look that uses this type role, when one does. */
  use?: string;
  sample: ReactNode;
}

export function TypeRolesShowcase() {
  const pangram = t({
    en: "The quick brown fox jumps over the lazy dog.",
    zh: "敏捷的棕色狐狸跃过懒惰的狗。",
  });

  const staticRows: RoleRow[] = [
    {
      name: "display",
      meta: "3rem · 1.1 · 800 · −0.025em",
      use: 'Heading look="display"',
      sample: t({ en: "Display", zh: "展示" }),
    },
    {
      name: "subDisplay",
      meta: "2rem · 1.1 · 800 · −0.025em",
      sample: t({ en: "Sub-display", zh: "副展示" }),
    },
    {
      name: "h1",
      meta: "1.5rem · 1.2 · 800 · −0.01em",
      use: 'Heading look="h1"',
      sample: t({ en: "Heading 1", zh: "标题 1" }),
    },
    {
      name: "h2",
      meta: "1.25rem · 1.2 · 700 · 0",
      use: 'Heading look="h2"',
      sample: t({ en: "Heading 2", zh: "标题 2" }),
    },
    {
      name: "h3",
      meta: "1.1rem · 1.2 · 700 · 0",
      use: 'Heading look="h3"',
      sample: t({ en: "Heading 3", zh: "标题 3" }),
    },
    {
      name: "h4",
      meta: "1rem · 1.3 · 700 · 0",
      use: 'Heading look="h4"',
      sample: t({ en: "Heading 4", zh: "标题 4" }),
    },
    {
      name: "body",
      meta: "1rem · 1.5 · 400 · 0",
      use: 'Text look="body"',
      sample: pangram,
    },
    {
      name: "bodySmall",
      meta: "0.85rem · 1.5 · 400 · 0",
      use: 'Text look="bodySmall"',
      sample: pangram,
    },
    {
      name: "label",
      meta: "0.85rem · 1.3 · 500 · 0",
      use: 'Text look="label"',
      sample: t({ en: "Original language", zh: "原始语言" }),
    },
    {
      name: "caption",
      meta: "0.75rem · 1.3 · 400 · 0",
      use: 'Text look="caption"',
      sample: t({ en: "Caption text", zh: "说明文字" }),
    },
    {
      name: "overline",
      meta: "0.7rem · 1.3 · 600 · 0.12em",
      use: 'Text look="overline"',
      sample: t({ en: "Overline label", zh: "上标签" }),
    },
    {
      name: "control",
      meta: "1.2rem → 1rem ≥ md · 1.3 · 500 · 0",
      sample: t({ en: "Control label", zh: "控件标签" }),
    },
    {
      name: "controlCaption",
      meta: "0.9rem → 0.75rem ≥ md · 1.3 · 400 · 0",
      sample: t({ en: "Control caption", zh: "控件说明" }),
    },
  ];

  const viewportRows: RoleRow[] = [
    {
      name: "fluidDisplay",
      meta: "2 → 5.25rem · 1.1 · 800 · −0.025em",
      sample: t({ en: "Kyoto", zh: "京都" }),
    },
    {
      name: "fluidH1",
      meta: "1.3 → 2rem · 1.2 · 700 · 0",
      sample: t({ en: "Heading 1", zh: "标题 1" }),
    },
    {
      name: "fluidH2",
      meta: "1.2 → 1.8rem · 1.2 · 700 · 0",
      sample: t({ en: "Heading 2", zh: "标题 2" }),
    },
    {
      name: "fluidH3",
      meta: "1 → 1.3rem · 1.3 · 700 · 0",
      sample: t({ en: "Heading 3", zh: "标题 3" }),
    },
    {
      name: "fluidLead",
      meta: "1 → 1.6rem · 1.5 · 400 · 0",
      sample: t({
        en: "Four days, two cities, one rail pass.",
        zh: "四天，两座城市，一张铁路通票。",
      }),
    },
  ];

  const containerRows: RoleRow[] = [
    {
      name: "cardTitle",
      meta: "1.1 → 1.4rem, 1.5rem ≥ lg · 1.2 · 700 · 0",
      sample: t({ en: "Kyoto in four days", zh: "京都四日" }),
    },
  ];

  const legend = t({
    en: "size · line height · weight · tracking",
    zh: "字号 · 行高 · 字重 · 字距",
  });

  return (
    <GuideSection
      title={t({
        en: "Pick a type role by the job of the text",
        zh: "按文字的用途选字体角色",
      })}
      lead={t({
        en: "A type role is named by what the text is, not by how big it is, and it sets the size, line height, weight and tracking together. The static type roles hold one size. The fluid ones grow with the viewport or with a container, for type of your own that should grow with the space it has. Every component uses a static type role.",
        zh: "字体角色以文字是什么来命名，而不是以它有多大，并同时设定字号、行高、字重与字距。固定的字体角色只有一个字号。流式的字体角色随视口或容器变大，用于你自建的、应随可用空间变大的文字。所有组件都使用固定的字体角色。",
      })}
    >
      <div css={stack.group}>
        <Movement
          label={t({ en: "Static", zh: "固定" })}
          description={t({
            en: "For everything inside an interface: headings, body, labels and captions. Text and Heading take their looks from these. control and controlCaption are the two that change: they step down at md together with controlSize, so a label in control fits a control sized with controlSize. Button, the fields, Checkbox and Switch set their labels in control, and menu section titles use controlCaption.",
            zh: "用于界面内的一切：标题、正文、标签与说明。Text 与 Heading 的 look 都取自这些。control 与 controlCaption 是其中会变化的两个：它们与 controlSize 一起在 md 处变小，因此用 control 的标签能与用 controlSize 设定尺寸的控件吻合。Button、各类输入框、Checkbox 与 Switch 的标签都用 control，菜单分组标题用 controlCaption。",
          })}
          snippet={
            <UsageSnippet
              code={`import * as stylex from "@stylexjs/stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlSize, font } from "@tuja/ui/tokens.stylex";

const styles = stylex.create({
  segment: {
    minBlockSize: controlSize._9,
    fontFamily: font.family,
  },
});

<button css={[typeRole.control, styles.segment]}>Week</button>`}
            />
          }
        >
          <RoleLedger legend={legend} rows={staticRows} />
        </Movement>

        <Movement
          label={t({ en: "Fluid to the viewport", zh: "随视口变化" })}
          description={t({
            en: "These step up at sm, md and lg. They are for the top of a landing page, where a title should grow on a wide screen. No component uses them. The lit column below is the step your window is on, and it moves as you resize.",
            zh: "它们在 sm、md 与 lg 处逐级增大，用于落地页顶部、应在宽屏上变大的标题。没有任何组件使用它们。下方高亮的一列是你的窗口当前所在的档位，会随缩放移动。",
          })}
          snippet={
            <UsageSnippet
              code={`<h1 css={typeRole.fluidDisplay}>Kyoto in four days</h1>
<p css={typeRole.fluidLead}>Four days, two cities, one rail pass.</p>`}
            />
          }
        >
          <RoleLedger legend={legend} rows={viewportRows} />
          <ViewportScaleSpecimen />
        </Movement>

        <Movement
          label={t({ en: "Fluid to a container", zh: "随容器变化" })}
          description={t({
            en: 'cardTitle follows the width of the container it sits in, for a title in a card that appears at many widths. Make the card a container with containerType "inline-size"; the title has to be inside it, because a container sizes what it holds, not itself. From lg up the type role stops following and sets at 1.5rem. It measures with cqmin, and an inline-size container has no height to give, so on a short, wide screen the viewport\'s height can cap it.',
            zh: 'cardTitle 跟随其所在容器的宽度，用于会以多种宽度出现的卡片里的标题。用 containerType "inline-size" 把卡片设为容器；标题必须在容器内部，因为容器决定的是它所包含内容的尺寸，而不是它自己的。从 lg 起，这个字体角色不再跟随容器，固定为 1.5rem。它以 cqmin 计算，而 inline-size 容器不提供高度，因此在又矮又宽的屏幕上，视口高度可能会限制它。',
          })}
          snippet={
            <UsageSnippet
              code={`const styles = stylex.create({
  card: { containerType: "inline-size" },
});

<article css={styles.card}>
  <h3 css={typeRole.cardTitle}>Kyoto in four days</h3>
</article>`}
            />
          }
        >
          <RoleLedger legend={legend} rows={containerRows} inContainer />
          <ContainerScaleSpecimen />
        </Movement>
      </div>
      <GuideNote>
        {t({
          en: "Every size is in rem, so it grows with the font size the reader sets in the browser. A px font-size on the root element fixes all of them; leave it unset, or give it in %.",
          zh: "所有字号都以 rem 为单位，因此会随读者在浏览器中设置的字号变大。在根元素上用 px 设定 font-size 会把它们全部固定；请不要设置，或用 % 设置。",
        })}
      </GuideNote>
    </GuideSection>
  );
}

interface MovementProps {
  label: string;
  description: string;
  snippet: ReactNode;
  children: ReactNode;
}

function Movement({ label, description, snippet, children }: MovementProps) {
  return (
    <section css={stack.item}>
      <div css={[corner.radius_3, stack.item, styles.movement]}>
        <header css={stack.tight}>
          <Heading level={3}>{label}</Heading>
          <p css={[typeRole.bodySmall, styles.movementDesc]}>{description}</p>
        </header>
        {children}
      </div>
      {snippet}
    </section>
  );
}

interface RoleLedgerProps {
  legend: string;
  rows: readonly RoleRow[];
  /** Puts each sample in an inline-size container, for a container type role. */
  inContainer?: boolean;
}

function RoleLedger({ legend, rows, inContainer = false }: RoleLedgerProps) {
  return (
    <div css={stack.tight}>
      <p css={[typeRole.caption, styles.legend]}>{legend}</p>
      <ol css={[stack.item, styles.ledger]}>
        {rows.map((row) => (
          <li key={row.name} css={styles.row}>
            <div css={[stack.tight, styles.meta]}>
              <span css={[typeRole.caption, styles.metaToken]}>
                <Identifier>{`typeRole.${row.name}`}</Identifier>
              </span>
              <span
                css={[
                  typeRole.caption,
                  typeModifier.numeric,
                  styles.metaDetail,
                ]}
              >
                {row.meta}
              </span>
              {row.use ? (
                <span css={[typeRole.caption, styles.metaDetail]}>
                  {row.use}
                </span>
              ) : null}
            </div>
            <div css={[styles.specimen, inContainer && styles.container]}>
              <span css={typeRole[row.name]}>{row.sample}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const PANEL_BORDER = `inset 0 0 0 1px ${color.border}`;

const styles = stylex.create({
  movement: {
    paddingBlock: space._5,
    paddingInline: space._5,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: PANEL_BORDER,
  },
  movementDesc: {
    margin: 0,
    color: color.fgMuted,
    maxInlineSize: measure.prose,
    textWrap: "pretty",
  },
  legend: {
    margin: 0,
    fontFamily: font.familyMono,
    color: color.fgMuted,
  },
  ledger: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  // Narrow: meta over specimen. Wide (md+): the meta moves into a fixed
  // column, so the specimens align down the ledger.
  row: {
    display: "grid",
    alignItems: "start",
    gap: rhythm.tight,
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "minmax(12rem, 15rem) minmax(0, 1fr)",
    },
  },
  meta: {
    minInlineSize: 0,
  },
  metaToken: {
    fontFamily: font.familyMono,
    color: color.fg,
  },
  metaDetail: {
    fontFamily: font.familyMono,
    color: color.fgMuted,
  },
  specimen: {
    minInlineSize: 0,
    maxInlineSize: measure.prose,
    overflowWrap: "break-word",
    color: color.fg,
  },
  container: {
    containerType: "inline-size",
  },
});
