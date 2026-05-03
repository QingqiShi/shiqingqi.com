"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef } from "react";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { border, color, font, shadow, space } from "#src/tokens.stylex.ts";
import { PixelSprite } from "../sprite/pixel-sprite";
import { types } from "../sprite/sprites";
import type { CreatureDef, Emotion } from "../state/creature-schema";
import { STAT_KEYS, type CreatureStats } from "../state/seed-stats";

/**
 * Lore payload rendered in the card and persisted across the session. Phase
 * 5 hydrates this from the AI route; the user can also paste their own
 * lore via the manual fallback. Both EN + ZH are kept around so a card
 * exported in one locale still preserves the other for export.
 */
export interface LoreData {
  loreEn: string;
  loreZh: string;
}

interface CreatureCardProps {
  def: CreatureDef;
  stats: CreatureStats;
  emotion: Emotion;
  lore?: LoreData | null;
  paused?: boolean;
}

type StatKey = keyof CreatureStats;

/**
 * Faux-Pokedex card. Renders a header band tinted with the creature's type
 * `accentColor`, a recessed sprite "screen", a stats panel with horizontal
 * bars, and a lore panel that falls back to a placeholder until Phase 5
 * wires in real text.
 *
 * Stats are accepted as a prop rather than recomputed here so the parent
 * (review screen) can memoize the seed-stats result alongside its other
 * derived data.
 *
 * Why CSS custom property over inline `style`: the accent colour is a
 * runtime value that needs to flow into multiple stylesheet rules
 * (`color-mix`, gradient stops, the header background). React's
 * `CSSProperties` type does not include arbitrary `--*` keys, so we set
 * the variable via a ref-effect instead of inlining the style object —
 * keeping this component free of `as` assertions.
 */
export function CreatureCard({
  def,
  stats,
  emotion,
  lore,
  paused = false,
}: CreatureCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const type = types[def.type];
  // The schema validates `def.type` against the live registry so this
  // lookup should always succeed in production. Fall back to a neutral
  // accent if a future schema migration leaves a stale type behind.
  const accentColor = type?.accentColor ?? "#888888";
  // The i18n Babel plugin only accepts string-literal values inside `t()`,
  // so we mirror the wizard's pattern (`step-palette.tsx`) and inline the
  // bilingual map here. Adding a new type means adding one more line — the
  // schema's literal-tuple of type IDs would catch a missing entry.
  const typeLabels: Record<string, string> = {
    leaf: t({ en: "Leaf", zh: "叶系" }),
    ember: t({ en: "Ember", zh: "余烬系" }),
    tide: t({ en: "Tide", zh: "潮汐系" }),
    dust: t({ en: "Dust", zh: "尘土系" }),
    glow: t({ en: "Glow", zh: "微光系" }),
    frost: t({ en: "Frost", zh: "霜冻系" }),
    dawn: t({ en: "Dawn", zh: "黎明系" }),
    void: t({ en: "Void", zh: "虚空系" }),
  };
  const typeLabel = typeLabels[def.type] ?? def.type;

  const namedFallback = t({ en: "Unnamed creature", zh: "未命名生物" });
  const displayName = def.name.length > 0 ? def.name : namedFallback;

  const statLabels: Record<StatKey, string> = {
    vigour: t({ en: "Vigour", zh: "体力" }),
    spark: t({ en: "Spark", zh: "灵感" }),
    ward: t({ en: "Ward", zh: "守护" }),
    hustle: t({ en: "Hustle", zh: "干劲" }),
  };

  useEffect(() => {
    const card = cardRef.current;
    if (card === null) return;
    card.style.setProperty("--pcc-accent", accentColor);
  }, [accentColor]);

  return (
    <article
      ref={cardRef}
      css={styles.card}
      data-testid="creature-card"
      data-type={def.type}
    >
      <header css={styles.header}>
        <h1 css={styles.name}>{displayName}</h1>
        <span css={styles.typeLabel}>{typeLabel}</span>
      </header>

      <div css={styles.spriteScreen}>
        <PixelSprite
          def={def}
          emotion={emotion}
          scale={8}
          paused={paused}
          aria-label={displayName}
        />
      </div>

      <section
        css={styles.statsPanel}
        aria-label={t({ en: "Stats", zh: "属性" })}
      >
        <ul css={styles.statsList}>
          {STAT_KEYS.map((key) => {
            const value = stats[key];
            // Stats are integers in [1, 100]; clamp defensively in case a
            // future seed function widens the range.
            const pct = Math.max(0, Math.min(100, value));
            return (
              <li key={key} css={styles.statRow}>
                <span css={styles.statLabel}>{statLabels[key]}</span>
                <StatBar percent={pct} />
                <span css={styles.statValue}>{String(value)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <CardLorePanel lore={lore ?? null} />
    </article>
  );
}

interface CardLorePanelProps {
  lore: LoreData | null;
}

function CardLorePanel({ lore }: CardLorePanelProps) {
  const locale = useLocale();
  // Show whichever lore matches the active locale; the other line is still
  // captured by `LoreData` so PNG export can include both halves.
  const activeLore =
    lore === null ? null : locale === "zh" ? lore.loreZh : lore.loreEn;

  return (
    <section css={styles.lorePanel}>
      <h2 css={styles.loreHeading}>{t({ en: "Lore", zh: "传说" })}</h2>
      {activeLore !== null && activeLore.length > 0 ? (
        <p css={styles.loreText}>{activeLore}</p>
      ) : (
        <p css={styles.lorePlaceholder}>
          {t({ en: "Lore coming soon", zh: "传说即将到来" })}
        </p>
      )}
    </section>
  );
}

interface StatBarProps {
  percent: number;
}

function StatBar({ percent }: StatBarProps) {
  // Same trick as the card-level CSS variable: thread the runtime fill
  // percentage into a CSS custom property via a ref so the stylesheet
  // rule can pick it up without `as` assertions.
  const fillRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const fill = fillRef.current;
    if (fill === null) return;
    fill.style.setProperty("--pcc-fill", `${String(percent)}%`);
  }, [percent]);

  return (
    <span css={styles.statBar} aria-hidden>
      <span ref={fillRef} css={styles.statBarFill} />
    </span>
  );
}

const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    backgroundColor: color.backgroundMain,
    borderRadius: border.radius_3,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    boxShadow: shadow._3,
    overflow: "hidden",
    inlineSize: "100%",
    maxInlineSize: "440px",
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space._2,
    paddingBlock: space._3,
    paddingInline: space._4,
    backgroundColor: "var(--pcc-accent, #888888)",
    color: "#ffffff",
    // A subtle sheen across the header makes the type colour read more
    // like a printed card and less like a flat block.
    backgroundImage:
      "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%)",
  },
  name: {
    fontSize: font.uiHeading2,
    fontWeight: font.weight_7,
    margin: 0,
    color: "inherit",
    textShadow: "0 1px 0 rgba(0, 0, 0, 0.18)",
  },
  typeLabel: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "inherit",
    opacity: 0.9,
  },
  spriteScreen: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: space._4,
    padding: space._3,
    minHeight: "260px",
    borderRadius: border.radius_3,
    backgroundColor: `color-mix(in srgb, var(--pcc-accent, #888888) 14%, ${color.backgroundRaised})`,
    boxShadow: "inset 0 2px 6px rgba(0, 0, 0, 0.12)",
  },
  statsPanel: {
    paddingInline: space._4,
    paddingBlock: space._2,
  },
  statsList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  statRow: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    gap: space._2,
  },
  statLabel: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    color: color.textMuted,
    minWidth: "4em",
  },
  statBar: {
    position: "relative",
    height: "10px",
    borderRadius: "999px",
    backgroundColor: color.controlTrack,
    overflow: "hidden",
  },
  statBarFill: {
    position: "absolute",
    insetBlock: 0,
    insetInlineStart: 0,
    inlineSize: "var(--pcc-fill, 0%)",
    backgroundColor: "var(--pcc-accent, #888888)",
    backgroundImage:
      "linear-gradient(90deg, color-mix(in srgb, var(--pcc-accent, #888888) 70%, white) 0%, var(--pcc-accent, #888888) 100%)",
    transitionProperty: "inline-size",
    transitionDuration: "240ms",
  },
  statValue: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    fontVariantNumeric: "tabular-nums",
    color: color.textMain,
    minWidth: "2.5em",
    textAlign: "end",
  },
  lorePanel: {
    margin: space._4,
    marginTop: space._3,
    padding: space._3,
    borderRadius: border.radius_2,
    borderWidth: border.size_1,
    borderStyle: "dashed",
    borderColor: color.border,
    backgroundColor: color.backgroundRaised,
    display: "flex",
    flexDirection: "column",
    gap: space._1,
  },
  loreHeading: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: color.textMuted,
    margin: 0,
  },
  loreText: {
    fontSize: font.uiBody,
    color: color.textMain,
    margin: 0,
    lineHeight: font.lineHeight_3,
  },
  lorePlaceholder: {
    fontSize: font.uiBody,
    color: color.textMuted,
    margin: 0,
    fontStyle: "italic",
  },
});
