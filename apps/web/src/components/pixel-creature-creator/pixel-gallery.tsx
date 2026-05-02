import * as stylex from "@stylexjs/stylex";
import { t } from "#src/i18n.ts";
import { PixelLayer } from "./sprite/pixel-layer";
import { PixelSprite } from "./sprite/pixel-sprite";
import { species } from "./sprite/species";
import { ACCESSORY_PALETTE, accessories, types } from "./sprite/sprites";
import {
  type CreatureDef,
  DEFAULT_CREATURE,
  EMOTIONS,
  type Emotion,
} from "./state/creature-schema";
import { buildQaSamples } from "./state/qa-samples";

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <section css={styles.section}>
      <h2 css={styles.sectionTitle}>{title}</h2>
      <div css={styles.sectionBody}>{children}</div>
    </section>
  );
}

interface PartCardProps {
  label: string;
  children: React.ReactNode;
}

function PartCard({ label, children }: PartCardProps) {
  return (
    <div css={styles.card}>
      <div css={styles.cardArt}>{children}</div>
      <div css={styles.cardLabel}>{label}</div>
    </div>
  );
}

/**
 * Four canonical creatures showcased across all 7 emotions. Picked to
 * exercise different species, types and accessories so a single screenshot
 * diff catches regressions across the library.
 */
const CANONICAL_CREATURES: ReadonlyArray<{ slot: string; def: CreatureDef }> = [
  {
    slot: "feline-leaf",
    def: {
      v: 2,
      species: "feline",
      accessories: [],
      type: "leaf",
      defaultEmotion: "idle",
      name: "",
    },
  },
  {
    slot: "draconic-ember",
    def: {
      v: 2,
      species: "draconic",
      accessories: ["antenna"],
      type: "ember",
      defaultEmotion: "idle",
      name: "",
    },
  },
  {
    slot: "piscine-tide",
    def: {
      v: 2,
      species: "piscine",
      accessories: ["scarf"],
      type: "tide",
      defaultEmotion: "idle",
      name: "",
    },
  },
  {
    slot: "plant-like-glow",
    def: {
      v: 2,
      species: "plant-like",
      accessories: ["leaf", "bow"],
      type: "glow",
      defaultEmotion: "idle",
      name: "",
    },
  },
];

interface PixelGalleryProps {
  // When true, the canonical 7-emotion grid renders in `paused` mode so the
  // Playwright visual fixture can snapshot a deterministic t=0 pose. Live
  // browser visitors still get full motion (the playground page only sets
  // this flag when `?paused=1` is in the URL).
  pausedCanonicalRow?: boolean;
}

export function PixelGallery({
  pausedCanonicalRow = false,
}: PixelGalleryProps = {}) {
  const def: CreatureDef = DEFAULT_CREATURE;

  // Resolve every label in render scope so the i18n Babel plugin sees t()
  // called with literal `{ en, zh }` objects. The transformed runtime
  // expects keys it can hash at compile time, so callers cannot pass
  // dynamic values like `t(part.label)` here.
  const emotionLabel: Record<Emotion, string> = {
    idle: t({ en: "Idle", zh: "平静" }),
    joy: t({ en: "Joy", zh: "喜悦" }),
    sad: t({ en: "Sad", zh: "悲伤" }),
    excited: t({ en: "Excited", zh: "兴奋" }),
    sleepy: t({ en: "Sleepy", zh: "瞌睡" }),
    grumpy: t({ en: "Grumpy", zh: "生气" }),
    curious: t({ en: "Curious", zh: "好奇" }),
  };

  const speciesLabels: Record<string, string> = {
    feline: t({ en: "Feline", zh: "猫科" }),
    canine: t({ en: "Canine", zh: "犬科" }),
    avian: t({ en: "Avian", zh: "鸟类" }),
    reptilian: t({ en: "Reptilian", zh: "爬虫" }),
    dinosaurian: t({ en: "Dinosaurian", zh: "恐龙" }),
    insectoid: t({ en: "Insectoid", zh: "昆虫" }),
    "worm-like": t({ en: "Worm-like", zh: "蠕虫" }),
    serpentine: t({ en: "Serpentine", zh: "蛇形" }),
    piscine: t({ en: "Piscine", zh: "鱼类" }),
    amphibian: t({ en: "Amphibian", zh: "两栖" }),
    "plant-like": t({ en: "Plant-like", zh: "植物" }),
    humanoid: t({ en: "Humanoid", zh: "人形" }),
    "object-based": t({ en: "Object", zh: "器物" }),
    robotic: t({ en: "Robotic", zh: "机械" }),
    draconic: t({ en: "Draconic", zh: "龙形" }),
    amorphous: t({ en: "Amorphous", zh: "不定形" }),
  };

  const accessoryLabels: Record<string, string> = {
    hat: t({ en: "Hat", zh: "帽子" }),
    scarf: t({ en: "Scarf", zh: "围巾" }),
    antenna: t({ en: "Antenna", zh: "触角" }),
    glasses: t({ en: "Glasses", zh: "眼镜" }),
    leaf: t({ en: "Leaf", zh: "叶子" }),
    bow: t({ en: "Bow", zh: "蝴蝶结" }),
  };

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

  const typeWord = t({ en: "type", zh: "种类" });
  const noneLabel = t({ en: "(none)", zh: "(无)" });

  const labelFor = (lookup: Record<string, string>, id: string): string =>
    lookup[id] ?? id;

  const qaSamples = buildQaSamples();

  return (
    <div data-testid="pixel-gallery" css={styles.root}>
      <Section title={t({ en: "Species", zh: "物种" })}>
        {Object.values(species).map((entry) =>
          entry === undefined ? null : (
            <PartCard key={entry.id} label={labelFor(speciesLabels, entry.id)}>
              <PixelSprite
                def={{ ...DEFAULT_CREATURE, species: entry.id }}
                scale={4}
                paused
              />
            </PartCard>
          ),
        )}
      </Section>

      <Section title={t({ en: "Accessories", zh: "饰品" })}>
        {Object.values(accessories).map((accessory) =>
          accessory === undefined ? null : (
            <PartCard
              key={accessory.id}
              label={labelFor(accessoryLabels, accessory.id)}
            >
              <PixelLayer
                tile={accessory.tile}
                palette={ACCESSORY_PALETTE}
                scale={4}
              />
            </PartCard>
          ),
        )}
      </Section>

      <Section title={t({ en: "Types", zh: "种类" })}>
        {Object.values(types).map((tp) =>
          tp === undefined ? null : (
            <PartCard
              key={tp.id}
              label={`${labelFor(typeLabels, tp.id)} · ${typeWord}`}
            >
              <div
                style={{ backgroundColor: tp.accentColor }}
                css={styles.typeAccent}
                title={tp.accentColor}
              />
            </PartCard>
          ),
        )}
      </Section>

      <Section title={t({ en: "Parts coverage", zh: "部件覆盖" })}>
        <div css={styles.canonicalGrid}>
          <div data-testid="parts-species" css={styles.canonicalRow}>
            <div css={styles.canonicalRowTitle}>species</div>
            <div css={styles.canonicalRowBody}>
              {Object.values(species).map((entry) =>
                entry === undefined ? null : (
                  <div
                    key={`parts-species-${entry.id}`}
                    data-testid={`parts-species-${entry.id}`}
                    css={styles.canonicalCard}
                  >
                    <PixelSprite
                      def={{ ...DEFAULT_CREATURE, species: entry.id }}
                      scale={4}
                      paused
                    />
                    <div css={styles.cardLabel}>
                      {labelFor(speciesLabels, entry.id)}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          <div data-testid="parts-accessories" css={styles.canonicalRow}>
            <div css={styles.canonicalRowTitle}>accessories</div>
            <div css={styles.canonicalRowBody}>
              {Object.values(accessories).map((part) =>
                part === undefined ? null : (
                  <div
                    key={`parts-accessory-${part.id}`}
                    data-testid={`parts-accessory-${part.id}`}
                    css={styles.canonicalCard}
                  >
                    <PixelSprite
                      def={{ ...DEFAULT_CREATURE, accessories: [part.id] }}
                      scale={4}
                      paused
                    />
                    <div css={styles.cardLabel}>
                      {labelFor(accessoryLabels, part.id)}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          <div data-testid="parts-types" css={styles.canonicalRow}>
            <div css={styles.canonicalRowTitle}>types</div>
            <div css={styles.canonicalRowBody}>
              {Object.values(types).map((tp) =>
                tp === undefined ? null : (
                  <div
                    key={`parts-type-${tp.id}`}
                    data-testid={`parts-type-${tp.id}`}
                    css={styles.canonicalCard}
                  >
                    <PixelSprite
                      def={{ ...DEFAULT_CREATURE, type: tp.id }}
                      scale={4}
                      paused
                    />
                    <div css={styles.cardLabel}>
                      {labelFor(typeLabels, tp.id)}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section
        title={t({
          en: "Combinatorial QA",
          zh: "组合自查",
        })}
      >
        {qaSamples.map((sample, idx) => {
          const accessorySummary =
            sample.def.accessories.length === 0
              ? noneLabel
              : sample.def.accessories.join(", ");
          const summary = `${sample.def.species} · ${sample.def.type} · ${accessorySummary}`;
          return (
            <div
              key={`qa-${String(idx)}`}
              data-testid={`qa-sample-${String(idx)}`}
              css={styles.canonicalCard}
            >
              <PixelSprite def={sample.def} scale={4} paused />
              <div css={styles.cardLabel}>{summary}</div>
            </div>
          );
        })}
      </Section>

      <Section
        title={t({
          en: "Canonical creatures, all emotions",
          zh: "标准生物 · 全情绪",
        })}
      >
        <div css={styles.canonicalGrid}>
          {CANONICAL_CREATURES.map((creature) => (
            <div key={creature.slot} css={styles.canonicalRow}>
              <div css={styles.canonicalRowTitle}>{creature.slot}</div>
              <div css={styles.canonicalRowBody}>
                {EMOTIONS.map((emotion) => (
                  <div
                    key={`${creature.slot}-${emotion}`}
                    data-testid={`canonical-${creature.slot}-${emotion}`}
                    css={styles.canonicalCard}
                  >
                    <PixelSprite
                      def={creature.def}
                      emotion={emotion}
                      scale={6}
                      paused={pausedCanonicalRow}
                      aria-label={`${creature.slot} ${emotionLabel[emotion]}`}
                    />
                    <div css={styles.cardLabel}>{emotionLabel[emotion]}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t({ en: "Zoom levels", zh: "缩放级别" })}>
        {[4, 6, 8, 12].map((scale) => (
          <div key={scale} css={styles.canonicalCard}>
            <PixelSprite def={def} scale={scale} />
            <div css={styles.cardLabel}>{`×${String(scale)}`}</div>
          </div>
        ))}
      </Section>

      <Section title={t({ en: "Reduced motion preview", zh: "弱化动画预览" })}>
        <div css={styles.canonicalCard}>
          <PixelSprite def={def} emotion="idle" scale={6} />
          <div css={styles.cardLabel}>
            {t({
              en: "(behaviour with prefers-reduced-motion)",
              zh: "(prefers-reduced-motion 表现)",
            })}
          </div>
        </div>
      </Section>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "32px",
    padding: "24px",
    paddingTop: "calc(24px + env(safe-area-inset-top))",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 600,
    margin: 0,
  },
  sectionBody: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    alignItems: "flex-end",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  cardArt: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    fontSize: "12px",
    color: "rgba(0, 0, 0, 0.7)",
    textAlign: "center",
  },
  typeAccent: {
    width: "64px",
    height: "32px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  canonicalCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  canonicalGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    width: "100%",
  },
  canonicalRow: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  canonicalRowTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "rgba(0, 0, 0, 0.7)",
  },
  canonicalRowBody: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    alignItems: "flex-end",
  },
});
