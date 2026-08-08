import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Spinner } from "@tuja/ui/components/spinner";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";

export function SpinnerShowcase() {
  const loadingLabel = t({ en: "Loading", zh: "加载中" });
  const savingLabel = t({ en: "Saving…", zh: "保存中…" });

  return (
    <>
      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="inline">
            <Spinner size="inline" label={loadingLabel} />
          </Specimen>
          <Specimen caption="sm">
            <Spinner size="sm" label={loadingLabel} />
          </Specimen>
          <Specimen caption="md">
            <Spinner size="md" label={loadingLabel} />
          </Specimen>
          <Specimen caption="lg">
            <Spinner size="lg" label={loadingLabel} />
          </Specimen>
        </SpecimenGrid>
        <ShowcaseHelper>
          {t({
            en: "sm, md and lg are fixed rem diameters. inline is 1em, so it takes the size of the text around it — that is what Button's loading state uses, so the spinner occupies exactly the box the icon it replaces did.",
            zh: "sm、md、lg 为固定的 rem 直径。inline 为 1em，会取周围文字的字号——按钮的加载态正是使用它，因此加载指示器所占空间与被替换的图标完全一致。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "Tone", zh: "色调" })}>
        <div css={styles.stack}>
          <ShowcaseHelper>
            {t({
              en: 'tone="current" inherits the surrounding text colour; tone="accent" pins the brand accent regardless of context.',
              zh: 'tone="current" 继承周围文本颜色；tone="accent" 无论上下文如何都固定使用品牌强调色。',
            })}
          </ShowcaseHelper>
          <div css={styles.toneRow}>
            <Specimen caption="accent">
              <Spinner tone="accent" label={loadingLabel} />
            </Specimen>
            <Specimen caption="current">
              <Spinner tone="current" label={loadingLabel} />
            </Specimen>
            <Specimen
              caption={t({
                en: "current · on accent",
                zh: "current · 强调色上",
              })}
            >
              <span css={[corner.radius_round, styles.accentPill]}>
                <Spinner tone="current" aria-hidden />
                <span>{t({ en: "Loading", zh: "加载中" })}</span>
              </span>
            </Specimen>
          </div>
        </div>
      </Showcase>

      <Showcase label={t({ en: "In a busy control", zh: "用于繁忙控件" })}>
        <div css={styles.stack}>
          <ShowcaseHelper>
            {t({
              en: "Inside a control that already announces its busy state (aria-busy), mark the spinner aria-hidden so it isn't announced twice.",
              zh: "在已通过 aria-busy 宣告繁忙状态的控件中，将 spinner 标记为 aria-hidden，避免被重复播报。",
            })}
          </ShowcaseHelper>
          <Specimen caption="aria-hidden">
            <Button aria-busy icon={<Spinner size="sm" aria-hidden />} disabled>
              {savingLabel}
            </Button>
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Reduced motion", zh: "减弱动态" })}>
        <ShowcaseHelper>
          {t({
            en: "Under prefers-reduced-motion the rotation is replaced by a gentle opacity pulse — never an infinite spin — so the busy affordance stays visible without vestibular motion.",
            zh: "在 prefers-reduced-motion 下，旋转会被柔和的透明度脉动取代——绝不无限旋转——使繁忙提示在不引发前庭不适的情况下保持可见。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <PropsTable
        rows={[
          {
            name: "size",
            type: '"inline" | "sm" | "md" | "lg"',
            defaultValue: '"md"',
            description: t({
              en: "Rendered diameter. sm/md/lg map to rem so the indicator scales with the user's font size (WCAG 1.4.4). inline takes 1em instead, matching the surrounding text — for a spinner standing in for an icon, so swapping it in doesn't shift the layout around it.",
              zh: "渲染直径。sm/md/lg 以 rem 表示，随用户字号缩放（WCAG 1.4.4）。inline 则取 1em，与周围文字一致——用于替代某个图标的加载指示器，因此替换时不会改变周围布局。",
            }),
          },
          {
            name: "tone",
            type: '"current" | "accent"',
            defaultValue: '"current"',
            description: t({
              en: '"current" inherits currentColor; "accent" pins the brand accent.',
              zh: "“current” 继承 currentColor；“accent” 固定品牌强调色。",
            }),
          },
          {
            name: "label",
            type: "string",
            description: t({
              en: "Accessible name announced via a polite live region. Provide exactly one of label / aria-hidden.",
              zh: "通过礼貌型 live region 播报的无障碍名称。label 与 aria-hidden 恰好提供其一。",
            }),
          },
          {
            name: "aria-hidden",
            type: "true",
            description: t({
              en: "Marks the spinner decorative — use inside a region that already announces the busy state.",
              zh: "将 spinner 标记为装饰性——用于已宣告繁忙状态的区域内。",
            }),
          },
          {
            name: "css",
            type: "StyleXStyles",
            description: t({
              en: "StyleX overrides, composed last so a caller can win over the defaults.",
              zh: "StyleX 覆盖样式，最后合成，使调用方可以覆盖默认值。",
            }),
          },
          {
            name: "...rest",
            type: 'ComponentProps<"span">',
            description: t({
              en: "Native span attributes (id, data-*, className, style, ref) are forwarded.",
              zh: "原生 span 属性（id、data-*、className、style、ref）会被转发。",
            }),
          },
        ]}
      />

      <DoDont
        do={
          <Button aria-busy icon={<Spinner size="sm" aria-hidden />} disabled>
            {savingLabel}
          </Button>
        }
        doCaption={t({
          en: "Hide the spinner (aria-hidden) when the control's aria-busy already announces the busy state.",
          zh: "当控件的 aria-busy 已宣告繁忙状态时，隐藏 spinner（aria-hidden）。",
        })}
        dont={
          <Button
            aria-busy
            icon={<Spinner size="sm" label={loadingLabel} />}
            disabled
          >
            {savingLabel}
          </Button>
        }
        dontCaption={t({
          en: "Don't give a spinner its own label inside a busy control — screen readers announce the state twice.",
          zh: "不要在繁忙控件内为 spinner 单独设置 label——屏幕阅读器会重复播报状态。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  toneRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._5,
    alignItems: "flex-start",
  },
  accentPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: space._2,
    paddingBlock: space._1,
    paddingInline: space._3,
    backgroundColor: color.accent,
    color: color.accentOn,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
  },
});
