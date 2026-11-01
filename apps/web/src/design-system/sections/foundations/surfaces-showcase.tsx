import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  border,
  color,
  controlHeight,
  controlSize,
  font,
  rhythm,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { Example } from "#src/design-system/example.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";

export function SurfacesShowcase() {
  return (
    <>
      <GuideSection
        title={t({ en: "Paint it with a skin.", zh: "给它披上一层外观。" })}
        lead={t({
          en: "Card wears cardSurface, and Popover and MenuButton wear popoverSurface. On an element that cannot be the component, compose the same style object.",
          zh: "Card 披的是 cardSurface，Popover 与 MenuButton 披的是 popoverSurface。在不能换成该组件的元素上，就组合同一个样式对象。",
        })}
      >
        <Example>
          <article css={[cardSurface.base, styles.padding]}>
            <Text>{t({ en: "Watchlist", zh: "待看清单" })}</Text>
          </article>
        </Example>
        <GuideNote>
          {t({
            en: "Neither skin pads its content, so add your own. Card adds space._5.",
            zh: "两种外观都不带内边距，要自己加。Card 加的是 space._5。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Give a larger surface a larger corner.",
          zh: "表面越大，圆角越大。",
        })}
        lead={t({
          en: "Round a corner with the corner primitive, which sets the radius and its squircle shape together. Take the step of the component your surface sits beside.",
          zh: "用 corner 原语做圆角，它同时设定半径与超椭圆角形。选用与你的表面相邻的组件所用的那一级。",
        })}
      >
        <ul role="list" aria-hidden="true" css={styles.scale}>
          <Step
            token="radius_1"
            name={t({ en: "Checkbox", zh: "复选框" })}
            shape={<div css={[corner.radius_1, styles.panel, styles.mark]} />}
          />
          <Step
            token="radius_2"
            name={t({ en: "Field", zh: "输入框" })}
            shape={<div css={[corner.radius_2, styles.panel, styles.field]} />}
          />
          <Step
            token="radius_3"
            name={t({ en: "Card", zh: "卡片" })}
            shape={<div css={[corner.radius_3, styles.panel, styles.card]} />}
          />
          <Step
            token="radius_4"
            name={t({ en: "Sheet", zh: "底部面板" })}
            shape={<div css={[corner.radius_4, styles.panel, styles.sheet]} />}
          />
          <Step
            token="squircle_round"
            name={t({ en: "Button", zh: "按钮" })}
            shape={
              <div css={[corner.squircle_round, styles.panel, styles.button]} />
            }
          />
          <Step
            token="radius_round"
            name={t({ en: "Chip", zh: "标签" })}
            shape={
              <div css={[corner.radius_round, styles.panel, styles.pill]} />
            }
          />
        </ul>
        <GuideNote>
          {t({
            en: 'A bare borderRadius needs cornerShape: "squircle", or the corner looks too large.',
            zh: '单独写的 borderRadius 要配上 cornerShape: "squircle"，否则角会显得过大。',
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Take the inset off a nested corner.",
          zh: "嵌套的圆角要减去内缩。",
        })}
        lead={t({
          en: "Give a surface inside another one's corner the outer radius less the inset between them. With the same radius, the gap widens at the corner.",
          zh: "位于另一个表面角落里的表面，圆角取外层圆角减去两者之间的内缩。若取相同的圆角，角上的间隙就会变宽。",
        })}
      >
        <div css={stack.tight}>
          <div css={styles.pair}>
            <NestedSide
              mark={<CheckIcon weight="bold" aria-hidden />}
              verdict={t({
                en: "Outer radius less the inset: the gap stays even.",
                zh: "外圆角减去内缩：间隙处处一致。",
              })}
            >
              <div css={[corner.radius_4, nested.outer]}>
                <div css={nested.inner} />
              </div>
            </NestedSide>
            <NestedSide
              mark={<XIcon weight="bold" aria-hidden />}
              verdict={t({
                en: "The same radius: the gap widens at the corner.",
                zh: "相同圆角：拐角处间隙变宽。",
              })}
            >
              <div css={[corner.radius_4, nested.outer]}>
                <div css={[nested.inner, corner.radius_4]} />
              </div>
            </NestedSide>
          </div>
          <UsageSnippet
            label={t({ en: "Styles", zh: "样式" })}
            code={NESTED_STYLES}
          />
        </div>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Cast a shadow only from what sits on top.",
          zh: "只有压在上面的东西才投阴影。",
        })}
        lead={t({
          en: "Card, Popover and Table hold content, so they take an edge and a fill, not a shadow. What sits over the content casts one, and the higher it sits, the deeper the step.",
          zh: "Card、Popover 与 Table 承载内容，所以用边框与填充，而不是阴影。压在内容之上的东西才投阴影，浮得越高，级别越深。",
        })}
      >
        <ul
          role="list"
          aria-hidden="true"
          css={[corner.radius_3, styles.floor]}
        >
          {SHADOW_STEPS.map((step) => (
            <li
              key={step.token}
              css={[corner.radius_3, styles.lifted, step.style]}
            >
              <span css={[typeRole.caption, styles.token]}>{step.token}</span>
            </li>
          ))}
        </ul>
        <GuideNote>
          {t({
            en: "A default Button takes shadow._2, and a TabBar over the content takes shadow._4.",
            zh: "默认的 Button 用 shadow._2，浮在内容之上的 TabBar 用 shadow._4。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Each step is deeper in dark mode, yet on the dark page itself it barely shows.",
            zh: "深色模式下每一级都更深，但在深色页面上依然几乎看不见。",
          })}
        </GuideNote>
      </GuideSection>
    </>
  );
}

interface StepProps {
  token: string;
  name: string;
  shape: ReactNode;
}

function Step({ token, name, shape }: StepProps) {
  return (
    <li css={[stack.tight, styles.step]}>
      {shape}
      <span css={stack.text}>
        <span css={[typeRole.caption, styles.token]}>{token}</span>
        <span css={[typeRole.caption, styles.name]}>{name}</span>
      </span>
    </li>
  );
}

interface NestedSideProps {
  mark: ReactNode;
  verdict: string;
  children: ReactNode;
}

function NestedSide({ mark, verdict, children }: NestedSideProps) {
  return (
    <figure css={[stack.tight, styles.side]}>
      {children}
      <figcaption css={[typeRole.bodySmall, styles.verdict]}>
        <span css={styles.glyph}>{mark}</span> {verdict}
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
  glyph: {
    display: "inline-block",
    verticalAlign: "-0.125em",
  },
  padding: {
    padding: space._5,
  },
  scale: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(3, minmax(0, 1fr))",
      [breakpoints.md]: "repeat(6, auto)",
    },
    justifyContent: "start",
    alignItems: "end",
    columnGap: rhythm.item,
    rowGap: rhythm.group,
  },
  step: {
    alignItems: "flex-start",
  },
  token: {
    fontFamily: font.familyMono,
    color: color.fg,
  },
  name: {
    color: color.fgMuted,
  },
  panel: {
    flexShrink: 0,
    maxInlineSize: "100%",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
  mark: {
    inlineSize: controlSize._5,
    blockSize: controlSize._5,
  },
  field: {
    inlineSize: "6rem",
    blockSize: controlHeight.md,
  },
  card: {
    inlineSize: "7rem",
    blockSize: "5rem",
  },
  sheet: {
    inlineSize: "9rem",
    blockSize: "7rem",
  },
  button: {
    inlineSize: "5rem",
    blockSize: controlHeight.md,
  },
  pill: {
    inlineSize: "4rem",
    blockSize: controlHeight.sm,
  },
  floor: {
    listStyle: "none",
    margin: 0,
    paddingBlockStart: { default: space._5, [breakpoints.md]: space._7 },
    paddingBlockEnd: space._10,
    paddingInline: { default: space._5, [breakpoints.md]: space._7 },
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgControlRaised,
    overflow: "clip",
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(3, minmax(0, 1fr))",
      [breakpoints.md]: "repeat(6, minmax(0, 1fr))",
    },
    columnGap: rhythm.item,
    rowGap: rhythm.group,
  },
  lifted: {
    display: "flex",
    alignItems: "flex-end",
    aspectRatio: "1",
    padding: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.borderControlSunken,
    backgroundColor: color.bgControlRaised,
  },
});

const nested = stylex.create({
  outer: {
    maxInlineSize: "16rem",
    padding: space._4,
    backgroundColor: color.bgNeutralSubtle,
  },
  inner: {
    blockSize: "4.5rem",
    borderRadius: `calc(${border.radius_4} - ${space._4})`,
    cornerShape: "squircle",
    backgroundColor: color.bgSurface,
  },
});

const NESTED_STYLES = `import { border, color, space } from "@tuja/ui/tokens.stylex";

const nested = stylex.create({
  outer: {
    maxInlineSize: "16rem",
    padding: space._4,
    backgroundColor: color.bgNeutralSubtle,
  },
  inner: {
    blockSize: "4.5rem",
    borderRadius: \`calc(\${border.radius_4} - \${space._4})\`,
    cornerShape: "squircle",
    backgroundColor: color.bgSurface,
  },
});`;

const shadowStyles = stylex.create({
  s1: { boxShadow: shadow._1 },
  s2: { boxShadow: shadow._2 },
  s3: { boxShadow: shadow._3 },
  s4: { boxShadow: shadow._4 },
  s5: { boxShadow: shadow._5 },
  s6: { boxShadow: shadow._6 },
});

const SHADOW_STEPS = [
  { token: "shadow._1", style: shadowStyles.s1 },
  { token: "shadow._2", style: shadowStyles.s2 },
  { token: "shadow._3", style: shadowStyles.s3 },
  { token: "shadow._4", style: shadowStyles.s4 },
  { token: "shadow._5", style: shadowStyles.s5 },
  { token: "shadow._6", style: shadowStyles.s6 },
];
