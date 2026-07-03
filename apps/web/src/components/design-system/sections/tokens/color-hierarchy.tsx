import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { systemPalette } from "@tuja/ui/palette-table";
import { border, color, font, shadow, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { Showcase } from "../../showcase.tsx";

// Tones sampled for the miniature hue ramps — a light-to-dark spread that reads
// as a compact stand-in for the full 21-tone scale demonstrated further down.
const MINI_TONES = [11, 20, 40, 60, 80, 92] as const;

// The semantic roles previewed as dots in stage 3, in the order they appear in
// the Roles section below.
const ROLE_DOTS = [
  color.accent,
  color.info,
  color.success,
  color.warning,
  color.danger,
];

/**
 * Opening explainer for the colour page: a three-stage flow that names how the
 * system is layered — the system palette feeds design tokens, which are grouped
 * into the surfaces and roles shown below. This is the one deliberately
 * highlighted block on the page, so it renders through the shared Showcase card
 * frame while the sections beneath it read plainly from the page canvas.
 */
export function ColorHierarchy() {
  return (
    <Showcase frame="card">
      <p css={styles.lead}>
        {t({
          en: "Colour is layered. A fixed system palette defines every available tone; design tokens reference those tones with intent; and the tokens are grouped into the surfaces and roles the app actually uses.",
          zh: "颜色是分层的。固定的系统调色板定义了所有可用色调；设计令牌带着语义引用这些色调；令牌再归类为应用真正使用的表面与角色。",
        })}
      </p>

      <div css={styles.flow}>
        <Stage
          step="01"
          name={t({ en: "System palette", zh: "系统调色板" })}
          detail={t({
            en: "13 hues × 21 tones. The full range of available colour — never referenced directly.",
            zh: "13 种色相 × 21 级色调。全部可用颜色的范围——但从不直接引用。",
          })}
          visual={<PaletteVisual />}
        />

        <Connector label={t({ en: "referenced by", zh: "被引用" })} />

        <Stage
          step="02"
          name={t({ en: "Design tokens", zh: "设计令牌" })}
          detail={t({
            en: "Semantic, purpose-named values that point at specific palette tones. What the app is built from.",
            zh: "语义化、按用途命名的值，指向特定的调色板色调。应用由此构建。",
          })}
          visual={<TokensVisual />}
        />

        <Connector label={t({ en: "grouped into", zh: "归类为" })} />

        <Stage
          step="03"
          name={t({ en: "Surfaces & roles", zh: "表面与角色" })}
          detail={t({
            en: "Tokens organised by purpose — background surfaces and semantic colour roles. Demonstrated below.",
            zh: "按用途组织的令牌——背景表面与语义颜色角色。下方演示。",
          })}
          visual={<TokensDownstreamVisual />}
        />
      </div>
    </Showcase>
  );
}

interface StageProps {
  step: string;
  name: string;
  detail: string;
  visual: ReactNode;
}

function Stage({ step, name, detail, visual }: StageProps) {
  return (
    <article css={styles.stage}>
      <header css={styles.stageHeader}>
        <span css={styles.step}>{step}</span>
        <h3 css={styles.stageName}>{name}</h3>
      </header>
      <div css={styles.visual}>{visual}</div>
      <p css={styles.detail}>{detail}</p>
    </article>
  );
}

function Connector({ label }: { label: string }) {
  return (
    <div css={styles.connector} aria-hidden>
      <span css={styles.connectorArrow}>→</span>
      <span css={styles.connectorLabel}>{label}</span>
    </div>
  );
}

// Stage 1 — thirteen thin hue columns, each a stack of tone segments: the
// hues × tones grid in miniature.
function PaletteVisual() {
  return (
    <div css={styles.palette} aria-hidden>
      {systemPalette.map((hue) => (
        <div key={hue.name} css={styles.paletteColumn}>
          {MINI_TONES.map((tone) => (
            <span
              key={tone}
              css={styles.paletteCell}
              style={{ backgroundColor: hue.tones[tone].bg }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Stage 2 — token chips, each a named reference resolving to a live token value.
function TokensVisual() {
  return (
    <div css={styles.tokens} aria-hidden>
      <span css={[styles.tokenChip, styles.chipAccent]}>accent</span>
      <span css={[styles.tokenChip, styles.chipSurface]}>bgSurface</span>
      <span css={[styles.tokenChip, styles.chipDanger]}>danger</span>
    </div>
  );
}

// Stage 3 — layered surface cards beside a role dot cluster: the two families
// demonstrated below.
function TokensDownstreamVisual() {
  return (
    <div css={styles.downstream} aria-hidden>
      <div css={styles.surfaceStack}>
        <span css={[styles.surfaceCard, styles.surfaceCardBack]} />
        <span css={[styles.surfaceCard, styles.surfaceCardFront]} />
      </div>
      <div css={styles.roleDots}>
        {ROLE_DOTS.map((role) => (
          <span
            key={role}
            css={styles.roleDot}
            style={{ backgroundColor: role }}
          />
        ))}
      </div>
    </div>
  );
}

const styles = stylex.create({
  lead: {
    margin: 0,
    fontSize: font.uiBody,
    color: color.textMuted,
    lineHeight: font.lineHeight_4,
    maxInlineSize: "70ch",
    textWrap: "pretty",
  },
  flow: {
    display: "flex",
    flexDirection: { default: "column", [breakpoints.lg]: "row" },
    gap: space._2,
  },
  stage: {
    flex: "1",
    minInlineSize: 0,
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    padding: space._4,
    backgroundColor: color.bgCanvas,
    border: `1px solid ${color.neutralBorder}`,
    borderRadius: border.radius_2,
  },
  stageHeader: {
    display: "flex",
    alignItems: "baseline",
    gap: space._2,
  },
  step: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    fontWeight: font.weight_6,
    color: color.textSubtle,
    letterSpacing: font.trackingWider,
  },
  stageName: {
    margin: 0,
    fontSize: font.uiBody,
    fontWeight: font.weight_7,
    color: color.textMain,
    letterSpacing: font.trackingTight,
    lineHeight: font.lineHeight_1,
  },
  visual: {
    display: "flex",
    alignItems: "center",
    minBlockSize: "48px",
  },
  detail: {
    margin: 0,
    fontSize: font.uiCaption,
    color: color.textSubtle,
    lineHeight: font.lineHeight_4,
    textWrap: "pretty",
  },

  // Connector between stages: horizontal arrow on wide layouts, pointing down
  // when the flow stacks.
  connector: {
    display: "flex",
    flexDirection: { default: "row", [breakpoints.lg]: "column" },
    alignItems: "center",
    justifyContent: "center",
    gap: space._1,
    paddingBlock: { default: space._0, [breakpoints.lg]: 0 },
    paddingInline: { default: 0, [breakpoints.lg]: space._0 },
  },
  connectorArrow: {
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_1,
    color: color.textSubtle,
    transform: { default: "rotate(90deg)", [breakpoints.lg]: "rotate(0deg)" },
  },
  connectorLabel: {
    fontSize: font.uiOverline,
    color: color.textSubtle,
    letterSpacing: font.trackingWide,
    whiteSpace: "nowrap",
  },

  // Stage 1 visual
  palette: {
    display: "flex",
    gap: "2px",
    inlineSize: "100%",
  },
  paletteColumn: {
    flex: "1",
    minInlineSize: 0,
    display: "flex",
    flexDirection: "column",
    borderRadius: border.radius_1,
    overflow: "hidden",
  },
  paletteCell: {
    blockSize: "8px",
  },

  // Stage 2 visual
  tokens: {
    display: "flex",
    flexWrap: "wrap",
    gap: space._1,
  },
  tokenChip: {
    display: "inline-flex",
    alignItems: "center",
    paddingBlock: space._0,
    paddingInline: space._2,
    borderRadius: border.radius_round,
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    fontWeight: font.weight_6,
    letterSpacing: font.trackingWide,
  },
  chipAccent: {
    backgroundColor: color.surfaceAccentSubtle,
    color: color.accentText,
  },
  chipSurface: {
    backgroundColor: color.bgSurfaceSunken,
    color: color.textMuted,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  chipDanger: {
    backgroundColor: color.surfaceDangerSubtle,
    color: color.dangerText,
  },

  // Stage 3 visual
  downstream: {
    display: "flex",
    alignItems: "center",
    gap: space._4,
  },
  // Two offset cards — the back one recessed, the front one raised with a
  // shadow — so "surfaces" reads as layered depth rather than three near-equal
  // near-white swatches.
  surfaceStack: {
    position: "relative",
    inlineSize: "42px",
    blockSize: "34px",
    flexShrink: 0,
  },
  surfaceCard: {
    position: "absolute",
    inlineSize: "28px",
    blockSize: "28px",
    borderRadius: border.radius_2,
    border: `1px solid ${color.neutralBorder}`,
  },
  surfaceCardBack: {
    insetBlockStart: 0,
    insetInlineStart: 0,
    backgroundColor: color.bgSurfaceSunken,
  },
  surfaceCardFront: {
    insetBlockEnd: 0,
    insetInlineEnd: 0,
    backgroundColor: color.bgSurfaceRaised,
    boxShadow: shadow._2,
  },
  roleDots: {
    display: "flex",
    gap: "4px",
  },
  roleDot: {
    inlineSize: "12px",
    blockSize: "12px",
    borderRadius: border.radius_round,
  },
});
