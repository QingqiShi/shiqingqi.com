import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { controlSize, font, space } from "@tuja/ui/tokens.stylex";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { ApiGrid, type ApiEntry } from "./api-grid.tsx";
import { primitivesSpecimen } from "./primitives-specimen.stylex.ts";

/** Four-point star used by the reset and a11y specimens. */
function SparkleIcon() {
  return (
    <svg
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 256 256"
      fill="none"
    >
      <path
        d="M128 24 152 104 232 128 152 152 128 232 104 152 24 128 104 104Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ResetSection() {
  const api: ApiEntry[] = [
    {
      token: "buttonReset.base",
      meta: "appearance · border · bg · padding · cursor · focus ring · touch target",
      description: t({
        en: "Strips native button chrome and puts the system focus ring and touch target back, so you can build a custom control on top of real, accessible <button> semantics.",
        zh: "移除原生按钮外观并补回系统焦点环与触摸目标，让你在真正可访问的 <button> 语义之上构建自定义控件。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Reset", zh: "重置" })}>
      <ShowcaseHelper>
        {t({
          en: "Neutralise browser defaults without abandoning semantics. Reach for buttonReset when a distinctive control needs full styling control but must stay a keyboard- and screen-reader-friendly <button>.",
          zh: "在不放弃语义的前提下抹平浏览器默认样式。当某个独特控件需要完全掌控样式、又必须保持对键盘和屏幕阅读器友好的 <button> 时，使用 buttonReset。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={primitivesSpecimen.tracks}>
        <Specimen
          caption={t({
            en: "A fully custom control on a real <button>",
            zh: "构建在真实 <button> 上的完全自定义控件",
          })}
        >
          <button
            type="button"
            css={[
              typeRole.label,
              buttonReset.base,
              flex.inlineCenter,
              corner.radius_round,
              styles.customControl,
            ]}
          >
            <span css={styles.icon}>
              <SparkleIcon />
            </span>
            {t({ en: "Add to list", zh: "加入清单" })}
          </button>
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { buttonReset } from "@tuja/ui/primitives/reset.stylex";

<button type="button" css={[buttonReset.base, styles.control]}>
  {icon}
  {label}
</button>`}
      />
    </Showcase>
  );
}

export function A11ySection() {
  const api: ApiEntry[] = [
    {
      token: "a11y.srOnly",
      meta: "clip-path:inset(50%) · 1px box",
      description: t({
        en: "Visually hidden, still announced — the canonical accessible-name primitive.",
        zh: "视觉上隐藏但仍会被朗读——标准的可访问名称原语。",
      }),
    },
    {
      token: "a11y.focusRing",
      meta: "2px accent · offset 2px · :focus-visible",
      description: t({
        en: "The shared keyboard focus indicator (WCAG 2.4.7), for any element that takes focus. buttonReset.base already carries it.",
        zh: "共享的键盘焦点指示器（WCAG 2.4.7），用于任何可获得焦点的元素。buttonReset.base 已经带有它。",
      }),
    },
    {
      token: "a11y.focusRingInset",
      meta: "offset -2px · :focus-visible",
      description: t({
        en: "Same ring pulled inside, for elements a clipped ancestor would crop.",
        zh: "同样的焦点环但向内偏移，用于会被裁切祖先元素裁掉外环的情况。",
      }),
    },
    {
      token: "a11y.focusRingWithin",
      meta: "on the frame · stylex.defaultMarker() on the field",
      description: t({
        en: "Same ring on the frame of a control that has no frame of its own, such as a bare text field.",
        zh: "同样的焦点环，画在自身没有外框的控件（例如无边框的文本输入框）的外框上。",
      }),
    },
    {
      token: "a11y.touchTarget",
      meta: "≥44px hit area · (pointer: coarse) · no tap flash",
      description: t({
        en: "On a touch screen, a tap across at least 44px without a change in how the control looks (WCAG 2.5.8). buttonReset.base and outlineSurface.interactive already carry it. An ancestor that clips overflow clips the hit area too.",
        zh: "在触摸屏上，控件能在至少 44px 的范围内响应点按，且外观不变（WCAG 2.5.8）。buttonReset.base 与 outlineSurface.interactive 已经带有它。裁切溢出内容的祖先元素也会裁切点按区域。",
      }),
    },
    {
      token: "a11y.touchRow",
      meta: "min-block-size 44px · (pointer: coarse) · no tap flash",
      description: t({
        en: "The touch target for a control that abuts its neighbours, such as a nav link in a list of rows. A hit area past its box would cover the next row, so on a touch screen the control itself grows to at least 44px tall.",
        zh: "用于与相邻控件紧挨着的控件的触摸目标，例如一列行中的导航链接。超出其边框的点按区域会盖住下一行，所以在触摸屏上控件本身会增高到至少 44px。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Accessibility", zh: "无障碍" })}>
      <ShowcaseHelper>
        {t({
          en: "The accessibility primitives that ship in the base of every component — surfaced in this section so a custom control built from primitives can inherit the same guarantees rather than reinventing them.",
          zh: "随每个组件基座一同交付的无障碍原语——在此单独呈现，让由原语搭建的自定义控件能继承同样的保证，而无需重新发明。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={primitivesSpecimen.tracks}>
        <Specimen
          caption={t({
            en: "srOnly names an icon-only control",
            zh: "srOnly 为纯图标控件提供名称",
          })}
        >
          <button
            type="button"
            css={[
              buttonReset.base,
              flex.center,
              corner.radius_round,
              styles.iconButton,
            ]}
          >
            <span css={styles.icon}>
              <SparkleIcon />
            </span>
            <span css={a11y.srOnly}>
              {t({ en: "Add to favourites", zh: "加入收藏" })}
            </span>
          </button>
        </Specimen>
        <Specimen
          caption={t({
            en: "focusRing — Tab to reveal",
            zh: "focusRing —— 按 Tab 显示",
          })}
        >
          <button
            type="button"
            css={[
              typeRole.label,
              buttonReset.base,
              flex.center,
              corner.radius_2,
              styles.focusTile,
            ]}
          >
            {t({ en: "Focus me", zh: "聚焦我" })}
          </button>
        </Specimen>
        <Specimen
          caption={t({
            en: "focusRingInset — ring stays inside a clipped frame",
            zh: "focusRingInset —— 焦点环留在被裁切外框内",
          })}
        >
          <div css={[corner.radius_2, styles.clipFrame]}>
            <button
              type="button"
              css={[
                typeRole.label,
                buttonReset.base,
                flex.center,
                a11y.focusRingInset,
                corner.radius_1,
                styles.insetTile,
              ]}
            >
              {t({ en: "Focus me", zh: "聚焦我" })}
            </button>
          </div>
        </Specimen>
      </SpecimenGrid>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";

<button css={buttonReset.base}>
  {icon}
  <span css={a11y.srOnly}>{accessibleName}</span>
</button>`}
      />
    </Showcase>
  );
}

const styles = stylex.create({
  // Reset + a11y specimens
  customControl: {
    gap: controlSize._2,
    paddingBlock: space._1,
    paddingInline: space._3,
    fontWeight: font.weight_6,
    color: color.fgOnAccent,
    backgroundColor: color.bgAccent,
  },
  icon: {
    display: "inline-flex",
    fontSize: controlSize._4,
    lineHeight: font.lineHeight_0,
  },
  iconButton: {
    inlineSize: "40px",
    blockSize: "40px",
    color: color.fgMuted,
    backgroundColor: color.bgControl,
  },
  focusTile: {
    paddingBlock: space._2,
    paddingInline: space._4,
    color: color.fg,
    backgroundColor: color.bgSurface,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
  clipFrame: {
    padding: space._1,
    overflow: "hidden",
    backgroundColor: color.bgSurfaceSunken,
    boxShadow: `inset 0 0 0 1px ${color.border}`,
  },
  insetTile: {
    inlineSize: "100%",
    paddingBlock: space._2,
    paddingInline: space._4,
    color: color.fg,
    backgroundColor: color.bgSurface,
  },
});
