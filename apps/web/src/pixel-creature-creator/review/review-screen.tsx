"use client";

import * as stylex from "@stylexjs/stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { computeSeedStats } from "#src/pixel-creature-creator/creature/compute-seed-stats.ts";
import type {
  CreatureDef,
  Emotion,
} from "#src/pixel-creature-creator/creature/creature-def-schema.ts";
import { decodeCreature } from "#src/pixel-creature-creator/creature/decode-creature.ts";
import { useLocationHash } from "#src/pixel-creature-creator/creature/use-location-hash.ts";
import { ActionRow } from "./action-row";
import { CreatureCard, type LoreData } from "./creature-card";
import { EmotionToggle } from "./emotion-toggle";

type DecodeStatus =
  | { kind: "loading" }
  | { kind: "ok"; def: CreatureDef; encodedHash: string }
  | { kind: "invalid" };

interface ReviewScreenProps {
  // Wizard E2E + the playground spec pass `?paused=1` so the sprite renders
  // its t=0 pose for stable visuals — same convention as `pixel-gallery`.
  paused?: boolean;
}

function decodeStatus(rawHash: string): DecodeStatus {
  const stripped = rawHash.replace(/^#/, "");
  if (stripped.length === 0) return { kind: "invalid" };
  const decoded = decodeCreature(stripped);
  return decoded === null
    ? { kind: "invalid" }
    : { kind: "ok", def: decoded, encodedHash: stripped };
}

/**
 * Review host. Decodes the creature from the URL fragment, owns
 * the local emotion override + lore state, and stitches the card and
 * action row together.
 */
export function ReviewScreen({ paused = false }: ReviewScreenProps) {
  const rawHash = useLocationHash();
  // Empty rawHash on the server means "loading"; the same value on the
  // client means "no hash — invalid link". Distinguish via a typeof check
  // so we don't render the invalid card during SSR/hydration.
  const status: DecodeStatus =
    typeof window === "undefined" ? { kind: "loading" } : decodeStatus(rawHash);
  const locale = useLocale();
  const createHref =
    locale === "en"
      ? "/en/pixel-creature-creator/create"
      : "/zh/pixel-creature-creator/create";

  if (status.kind === "loading") {
    return (
      <div css={[stack.item, styles.root]} data-testid="review-loading">
        <p css={[typeRole.bodySmall, styles.muted]}>
          {t({ en: "Loading…", zh: "加载中…" })}
        </p>
      </div>
    );
  }

  if (status.kind === "invalid") {
    return (
      <div css={[stack.item, styles.root]} data-testid="review-invalid">
        <div css={stack.tight}>
          <h1 css={[typeRole.h2, styles.heading]}>
            {t({ en: "Broken creature link", zh: "无效的生物链接" })}
          </h1>
          <p css={[typeRole.bodySmall, styles.muted]}>
            {t({
              en: "We couldn't decode this creature. Try designing a new one.",
              zh: "我们无法解析这个生物。试着重新设计一个吧。",
            })}
          </p>
        </div>
        <Link
          href={createHref}
          data-testid="review-cta"
          {...stylex.props(typeRole.body, styles.cta)}
        >
          {t({ en: "Open the creator", zh: "打开创造器" })}
        </Link>
      </div>
    );
  }

  // Key by `encodedHash` so a hashchange (e.g. Shuffle navigates to a new
  // creature) forces a fresh `ReviewBody` mount. Without this, the local
  // `emotion` state initialized from the previous `def.defaultEmotion`
  // would persist across creatures.
  return (
    <ReviewBody
      key={status.encodedHash}
      def={status.def}
      encodedHash={status.encodedHash}
      paused={paused}
    />
  );
}

interface ReviewBodyProps {
  def: CreatureDef;
  encodedHash: string;
  paused: boolean;
}

function ReviewBody({ def, encodedHash, paused }: ReviewBodyProps) {
  const [emotion, setEmotion] = useState<Emotion>(def.defaultEmotion);
  // The action row sets the lore from the "Conjure lore" fetch or from the
  // manual fallback. The state is here so that the card and the action row
  // show the same value. The state is in memory only, thus a refresh clears
  // the lore.
  const [lore, setLore] = useState<LoreData | null>(null);

  // `seedStats` is deterministic and pure — derive once per def change so
  // every emotion toggle re-render reuses the same numbers.
  const stats = useMemo(() => computeSeedStats(def), [def]);

  return (
    <div css={[stack.item, styles.root]} data-testid="review-screen">
      <main css={[stack.item, styles.main]}>
        <CreatureCard
          def={def}
          stats={stats}
          emotion={emotion}
          lore={lore}
          paused={paused}
        />
        <EmotionToggle active={emotion} onChange={setEmotion} />
        <ActionRow
          def={def}
          emotion={emotion}
          lore={lore}
          onLoreChange={setLore}
          encodedHash={encodedHash}
        />
      </main>
    </div>
  );
}

const styles = stylex.create({
  root: {
    padding: space._4,
    paddingTop: `calc(${space._10} + env(safe-area-inset-top))`,
    paddingBottom: `calc(${space._4} + env(safe-area-inset-bottom))`,
    maxInlineSize: "640px",
    marginInline: "auto",
    minHeight: "100dvh",
    boxSizing: "border-box",
    alignItems: "stretch",
  },
  main: {
    alignItems: "center",
    width: "100%",
  },
  heading: {
    margin: 0,
    color: color.fg,
  },
  muted: {
    color: color.fgMuted,
    margin: 0,
  },
  cta: {
    alignSelf: "flex-start",
    paddingBlock: space._2,
    paddingInline: space._4,
    borderRadius: "10px",
    cornerShape: "squircle",
    backgroundColor: {
      default: color.bgAccent,
      ":hover": color.bgAccentHover,
    },
    color: color.fgOnAccent,
    textDecoration: "none",
    transitionProperty: "background-color",
    transitionDuration: "120ms",
    fontWeight: font.weight_6,
  },
});
