import * as stylex from "@stylexjs/stylex";
import { Progress } from "@tuja/ui/components/progress";
import { progressTokens } from "@tuja/ui/components/progress.stylex";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen, SpecimenGrid } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";
import { ProgressStepper } from "./progress-specimens.tsx";

const renderedMarkup = `<Progress label="Checkout" value={3} max={5} aria-valuetext="Step 3 of 5" />

// renders

<div
  role="progressbar"
  aria-label="Checkout"
  aria-valuenow="3"
  aria-valuemin="0"
  aria-valuemax="5"
  aria-valuetext="Step 3 of 5"
/>`;

export function ProgressShowcase() {
  const uploadingLabel = t({ en: "Uploading photos", zh: "正在上传照片" });
  const connectingLabel = t({ en: "Connecting…", zh: "正在连接…" });

  return (
    <>
      <Showcase label={t({ en: "Values", zh: "取值" })}>
        <SpecimenGrid>
          <Specimen caption="0">
            <Progress
              value={0}
              label={t({ en: "Upload progress", zh: "上传进度" })}
            />
          </Specimen>
          <Specimen caption="25">
            <Progress
              value={25}
              label={t({ en: "Download progress", zh: "下载进度" })}
            />
          </Specimen>
          <Specimen caption="60">
            <Progress
              value={60}
              label={t({ en: "Import progress", zh: "导入进度" })}
            />
          </Specimen>
          <Specimen caption="100">
            <Progress
              value={100}
              label={t({ en: "Export progress", zh: "导出进度" })}
            />
          </Specimen>
        </SpecimenGrid>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "value is clamped to 0–max before anything reaches ARIA, and a non-finite number falls back to 0 — a bad reading can never announce a figure a screen reader is unable to interpret.",
            zh: "value 在进入 ARIA 之前会被限制在 0 到 max 之间，非有限数值则回退为 0——错误的读数不会让屏幕阅读器播报出无法解释的数字。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Sizes", zh: "尺寸" })}>
        <SpecimenGrid>
          <Specimen caption="sm">
            <Progress
              size="sm"
              value={60}
              label={t({ en: "Sync progress", zh: "同步进度" })}
            />
          </Specimen>
          <Specimen caption="md">
            <Progress
              size="md"
              value={60}
              label={t({ en: "Backup progress", zh: "备份进度" })}
            />
          </Specimen>
          <Specimen caption="lg">
            <Progress
              size="lg"
              value={60}
              label={t({ en: "Render progress", zh: "渲染进度" })}
            />
          </Specimen>
        </SpecimenGrid>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "The three steps map to rem, so the track thickens with the user's font size instead of staying pinned to a pixel height (WCAG 1.4.4).",
            zh: "三个尺寸阶梯以 rem 表示，因此轨道厚度随用户字号变化，而不是固定在某个像素高度（WCAG 1.4.4）。",
          })}
        </Text>
      </Showcase>

      <Showcase
        label={t({ en: "Counting, not percent", zh: "计数而非百分比" })}
      >
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
            {t({
              en: 'Set max when you are counting things: the bar then reports aria-valuenow="3" against aria-valuemax="5". A screen reader still computes "60%" from that pair, so pass aria-valuetext whenever the count is what the reader is following.',
              zh: '当你计的是件数时请设置 max：进度条会以 aria-valuenow="3" 对照 aria-valuemax="5" 报告。屏幕阅读器仍会由这对数值算出“60%”，因此当用户关心的是件数时，请传入 aria-valuetext。',
            })}
          </Text>
          <Specimen caption="aria-valuetext">
            <Progress
              value={3}
              max={5}
              size="lg"
              label={t({ en: "Checkout", zh: "结账流程" })}
              aria-valuetext={t({ en: "Step 3 of 5", zh: "第 3 步，共 5 步" })}
            />
          </Specimen>
        </div>
      </Showcase>

      <Showcase
        label={t({ en: "What a screen reader gets", zh: "屏幕阅读器读到什么" })}
      >
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
            {t({
              en: "label is required and becomes the accessible name. The component writes role, the name and every aria-value* attribute after the caller's props, so a stray aria-label or aria-valuenow at the callsite cannot replace what the bar actually reports.",
              zh: "label 为必填，并成为可访问名称。组件在调用方属性之后才写入 role、名称以及全部 aria-value* 属性，因此调用处误传的 aria-label 或 aria-valuenow 无法替换进度条真正报告的内容。",
            })}
          </Text>
          <UsageSnippet
            code={renderedMarkup}
            label={t({ en: "Rendered markup", zh: "渲染结果" })}
          />
        </div>
      </Showcase>

      <Showcase label={t({ en: "Interactive", zh: "交互" })}>
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
            {t({
              en: "Step the value and watch aria-valuenow follow it. The indicator eases between widths; under prefers-reduced-motion it jumps straight to the new width instead.",
              zh: "调整数值，观察 aria-valuenow 随之变化。指示条会在宽度之间缓动；在 prefers-reduced-motion 下则直接跳到新宽度。",
            })}
          </Text>
          <Specimen caption={t({ en: "stepped value", zh: "步进数值" })}>
            <ProgressStepper />
          </Specimen>
        </div>
      </Showcase>

      <Showcase label={t({ en: "Indicator colour", zh: "指示条颜色" })}>
        <SpecimenGrid>
          <Specimen caption="color.accent">
            <Progress
              value={46}
              size="lg"
              label={t({ en: "Storage used", zh: "已用存储" })}
            />
          </Specimen>
          <Specimen caption="color.warning">
            <Progress
              value={78}
              size="lg"
              css={styles.warningIndicator}
              label={t({ en: "Storage filling up", zh: "存储即将占满" })}
            />
          </Specimen>
          <Specimen caption="color.danger">
            <Progress
              value={96}
              size="lg"
              css={styles.dangerIndicator}
              label={t({ en: "Storage almost full", zh: "存储几乎已满" })}
            />
          </Specimen>
        </SpecimenGrid>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "The indicator is a ::before pseudo-element, so css cannot reach it. progressTokens.indicatorColor is the way in — the same escape hatch, one level down. Retinting by threshold like this needs a second signal too: colour alone is not a status (WCAG 1.4.1).",
            zh: "指示条是 ::before 伪元素，css 无法触及。progressTokens.indicatorColor 就是入口——同一个逃生舱，只是下沉一层。像这样按阈值改色时还需要第二个信号：仅靠颜色不足以表达状态（WCAG 1.4.1）。",
          })}
        </Text>
      </Showcase>

      <PropsTable component="progress" />

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
            {t({
              en: "Progress has no indeterminate state, by design: a bar that cannot finish is a Spinner in the wrong clothes. Pick between the two by what you know, not by which one looks better.",
              zh: "进度条刻意不提供不确定状态：一条走不完的进度条，只是穿错衣服的 Spinner。在两者之间选择，依据是你知道什么，而不是哪个更好看。",
            })}
          </Text>
          <DoDont
            do={
              <div css={[flex.col, styles.guideStack]}>
                <Text look="bodySmall">{uploadingLabel}</Text>
                <Progress value={62} label={uploadingLabel} />
              </div>
            }
            doCaption={t({
              en: "Use Progress when the total is known — the value tells the reader how much is left, and the bar announces that number.",
              zh: "当总量已知时使用进度条——数值告诉用户还剩多少，它也会把这个数字播报出来。",
            })}
            dont={
              <div css={[flex.col, styles.guideStack]}>
                <Text look="bodySmall">{connectingLabel}</Text>
                <Progress value={80} label={connectingLabel} />
              </div>
            }
            dontCaption={t({
              en: "Don't park a bar at a made-up value for work with no measurable end — a wait of unknown length is Spinner's job.",
              zh: "不要为没有明确终点的工作把进度条停在随手编出的数值上——长度未知的等待应交给 Spinner。",
            })}
          />
        </div>
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._3,
  },
  note: {
    maxInlineSize: "65ch",
  },
  guideStack: {
    inlineSize: "100%",
    gap: space._2,
  },
  warningIndicator: {
    [progressTokens.indicatorColor]: color.warning,
  },
  dangerIndicator: {
    [progressTokens.indicatorColor]: color.danger,
  },
});
