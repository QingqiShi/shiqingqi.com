import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { border, color, font, shadow, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";

export function ShadowsShowcase() {
  return (
    <Showcase label={t({ en: "Shadows", zh: "阴影" })}>
      <ShowcaseHelper>
        {t({
          en: "Five elevation steps. Each tile lifts further from the stage so the cast shadow can do its job — separating the object from the ground beneath it.",
          zh: "五级悬浮高度。方块依次抬离台面，让投射出的阴影把物体与底面分开。",
        })}
      </ShowcaseHelper>
      <div css={styles.stage}>
        <ElevationTile
          token="shadow._1"
          shadowStyle={styles.shadow1}
          liftStyle={styles.lift1}
        />
        <ElevationTile
          token="shadow._2"
          shadowStyle={styles.shadow2}
          liftStyle={styles.lift2}
        />
        <ElevationTile
          token="shadow._3"
          shadowStyle={styles.shadow3}
          liftStyle={styles.lift3}
        />
        <ElevationTile
          token="shadow._4"
          shadowStyle={styles.shadow4}
          liftStyle={styles.lift4}
        />
        <ElevationTile
          token="shadow._5"
          shadowStyle={styles.shadow5}
          liftStyle={styles.lift5}
        />
      </div>
    </Showcase>
  );
}

interface ElevationTileProps {
  token: string;
  shadowStyle: StyleXStyles;
  liftStyle: StyleXStyles;
}

function ElevationTile({ token, shadowStyle, liftStyle }: ElevationTileProps) {
  return (
    <div css={styles.cell}>
      <div css={styles.floor}>
        <div css={[styles.tile, shadowStyle, liftStyle]} />
      </div>
      <div css={styles.caption}>
        <span css={styles.token}>{token}</span>
      </div>
    </div>
  );
}

const styles = stylex.create({
  stage: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(5, minmax(0, 1fr))",
    },
    gap: space._00,
    borderRadius: border.radius_2,
    overflow: "hidden",
    // Stage is the canvas ground the tiles lift off; the tiles use the raised
    // surface so the shadow separates a real elevation step from the ground,
    // rather than a high-contrast "bright" pop.
    backgroundColor: color.bgCanvas,
    boxShadow: `inset 0 0 0 1px ${color.neutralBorder}`,
  },
  cell: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
  },
  floor: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    blockSize: {
      default: "96px",
      [breakpoints.md]: "128px",
    },
    paddingBlockStart: space._4,
    paddingBlockEnd: space._2,
    paddingInline: space._3,
  },
  tile: {
    inlineSize: "56px",
    blockSize: "56px",
    borderRadius: border.radius_2,
    backgroundColor: color.bgSurfaceRaised,
  },
  lift1: { transform: "translateY(0)" },
  lift2: { transform: "translateY(-2px)" },
  lift3: { transform: "translateY(-5px)" },
  lift4: { transform: "translateY(-9px)" },
  lift5: { transform: "translateY(-14px)" },
  shadow1: { boxShadow: shadow._1 },
  shadow2: { boxShadow: shadow._2 },
  shadow3: { boxShadow: shadow._3 },
  shadow4: { boxShadow: shadow._4 },
  shadow5: { boxShadow: shadow._5 },
  caption: {
    display: "flex",
    justifyContent: "center",
    paddingBlock: space._2,
    paddingInline: space._3,
    borderBlockStartWidth: "1px",
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
    minInlineSize: 0,
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
    lineHeight: font.lineHeight_2,
    textAlign: "center",
    overflowWrap: "anywhere",
  },
});
