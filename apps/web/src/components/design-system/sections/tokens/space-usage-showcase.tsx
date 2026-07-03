import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { Showcase } from "../../showcase.tsx";

interface DemoStep {
  member: string;
  style: StyleXStyles;
}

export function SpaceUsageShowcase() {
  const insets: DemoStep[] = [
    { member: "_2", style: styles.p2 },
    { member: "_3", style: styles.p3 },
    { member: "_4", style: styles.p4 },
    { member: "_5", style: styles.p5 },
    { member: "_6", style: styles.p6 },
  ];
  const gaps: DemoStep[] = [
    { member: "_1", style: styles.g1 },
    { member: "_2", style: styles.g2 },
    { member: "_3", style: styles.g3 },
    { member: "_4", style: styles.g4 },
    { member: "_5", style: styles.g5 },
  ];

  return (
    <Showcase label={t({ en: "In use", zh: "应用" })}>
      <Panel
        title={t({ en: "Padding", zh: "内边距" })}
        description={t({
          en: "The same tokens as inset — the ring of space a surface holds around its content. Step up the scale and density loosens.",
          zh: "同一批令牌作为内边距——表面在内容四周留出的空间环。沿阶梯上行，密度随之松弛。",
        })}
      >
        <div css={styles.grid}>
          {insets.map((step) => (
            <figure key={step.member} css={styles.figure}>
              <div
                css={[styles.pad, step.style]}
                data-author-token={`space.${step.member}`}
              >
                <span css={styles.content} />
              </div>
              <figcaption
                css={styles.caption}
              >{`space.${step.member}`}</figcaption>
            </figure>
          ))}
        </div>
      </Panel>

      <Panel
        title={t({ en: "Gap", zh: "间距" })}
        description={t({
          en: "The same tokens as the space between siblings — the vertical rhythm of a stack. One value on the parent spaces every child evenly.",
          zh: "同一批令牌作为同级元素之间的间距——堆叠的垂直节奏。父级的一个取值即可让每个子元素均匀分布。",
        })}
      >
        <div css={styles.grid}>
          {gaps.map((step) => (
            <figure key={step.member} css={styles.figure}>
              <div
                css={[styles.stack, step.style]}
                data-author-token={`space.${step.member}`}
              >
                <span css={styles.slab} />
                <span css={styles.slab} />
                <span css={styles.slab} />
              </div>
              <figcaption
                css={styles.caption}
              >{`space.${step.member}`}</figcaption>
            </figure>
          ))}
        </div>
      </Panel>
    </Showcase>
  );
}

interface PanelProps {
  title: string;
  description: string;
  children: ReactNode;
}

function Panel({ title, description, children }: PanelProps) {
  return (
    <section css={styles.panel}>
      <header css={styles.panelHeader}>
        <h3 css={styles.panelTitle}>{title}</h3>
        <p css={styles.panelDesc}>{description}</p>
      </header>
      {children}
    </section>
  );
}

const PANEL_BORDER = `inset 0 0 0 1px ${color.neutralBorder}`;

const styles = stylex.create({
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  panelHeader: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  panelTitle: {
    margin: 0,
    fontSize: font.uiBody,
    fontWeight: font.weight_7,
    color: color.textMain,
    letterSpacing: font.trackingSnug,
  },
  panelDesc: {
    margin: 0,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    lineHeight: font.lineHeight_4,
    maxInlineSize: "60ch",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))",
    gap: space._2,
  },
  figure: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    margin: 0,
    minInlineSize: 0,
  },
  // Padding demo: the accent block is the content; the raised surface's ring
  // around it is the token's inset made visible.
  pad: {
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: PANEL_BORDER,
  },
  content: {
    display: "block",
    blockSize: space._8,
    borderRadius: border.radius_1,
    backgroundColor: color.surfaceAccentMuted,
  },
  // Gap demo: three slabs whose separation is the token, inside a matching frame.
  stack: {
    display: "flex",
    flexDirection: "column",
    padding: space._3,
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: PANEL_BORDER,
  },
  slab: {
    blockSize: space._2,
    borderRadius: border.radius_1,
    backgroundColor: color.surfaceAccentMuted,
  },
  caption: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    textAlign: "center",
  },
  p2: { padding: space._2 },
  p3: { padding: space._3 },
  p4: { padding: space._4 },
  p5: { padding: space._5 },
  p6: { padding: space._6 },
  g1: { gap: space._1 },
  g2: { gap: space._2 },
  g3: { gap: space._3 },
  g4: { gap: space._4 },
  g5: { gap: space._5 },
});
