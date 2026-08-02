import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { border, color, font, shadow, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { gridlineGround } from "../../gridline-ground.stylex.ts";
import { Identifier } from "../../identifier.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";

export function ShadowsShowcase() {
  return (
    <Showcase label={t({ en: "Shadows", zh: "阴影" })}>
      <ShowcaseHelper>
        {t({
          en: "Six levels that lift, plus one inset that sinks. Each tile rises further from the stage, so the cast shadow separates it from the ground beneath. Every caption names the surfaces that level is for.",
          zh: "六个上抬的层级，另有一个下沉的内嵌。方块依次抬离台面，让投射的阴影把物体与底面分开。每条说明标出该层级适用的表面。",
        })}
      </ShowcaseHelper>
      <div css={[gridlineGround.base, styles.stage, styles.lanes]}>
        <DepthTile
          token="shadow._1"
          usage={t({
            en: "Thumbs, pips, and chat bubbles.",
            zh: "滑块、圆点与聊天气泡。",
          })}
          tileStyle={styles.level1}
        />
        <DepthTile
          token="shadow._2"
          usage={t({
            en: "Resting buttons, switches, and chrome.",
            zh: "静止的按钮、开关与界面外框。",
          })}
          tileStyle={styles.level2}
        />
        <DepthTile
          token="shadow._3"
          usage={t({
            en: "Hover lift, and bordered panels.",
            zh: "悬停抬起与带边框的面板。",
          })}
          tileStyle={styles.level3}
        />
        <DepthTile
          token="shadow._4"
          usage={t({
            en: "Reserved between panel and overlay.",
            zh: "面板与覆盖层之间的保留层级。",
          })}
          tileStyle={styles.level4}
        />
        <DepthTile
          token="shadow._5"
          usage={t({
            en: "Menus and popovers over the page.",
            zh: "浮于页面之上的菜单与弹出层。",
          })}
          tileStyle={styles.level5}
        />
        <DepthTile
          token="shadow._6"
          usage={t({
            en: "The mobile navigation rail over a scrim.",
            zh: "遮罩之上的移动端导航栏。",
          })}
          tileStyle={styles.level6}
        />
      </div>
      {/* The inset goes the other way, so it gets its own plaque: a well is
          carved into a panel rather than lifted off the canvas, which is why
          this ground is the surface tone instead of the canvas tone. */}
      <div css={[gridlineGround.base, styles.stage, styles.insetStage]}>
        <DepthTile
          token="shadow.inset"
          usage={t({
            en: "Wells that content sits inside.",
            zh: "内容置于其中的凹位。",
          })}
          tileStyle={styles.wellTile}
        />
      </div>
    </Showcase>
  );
}

interface DepthTileProps {
  token: string;
  usage: string;
  tileStyle: StyleXStyles;
}

function DepthTile({ token, usage, tileStyle }: DepthTileProps) {
  return (
    <div css={styles.cell}>
      <div css={styles.floor}>
        <div css={[styles.tile, tileStyle]} />
      </div>
      <div css={styles.caption}>
        <span css={styles.usage}>{usage}</span>
        <span css={styles.token}>
          <Identifier>{token}</Identifier>
        </span>
      </div>
    </div>
  );
}

const styles = stylex.create({
  // The stage is the canvas ground the tiles lift off; the tiles use the raised
  // surface so the shadow separates a real elevation level from the ground,
  // rather than reading as a high-contrast "bright" pop.
  stage: {
    display: "grid",
    gap: space._00,
  },
  // Six levels divide cleanly as 1×6, 2×3, or 6×1 — those breakpoints avoid
  // orphan lanes at every width.
  lanes: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(3, minmax(0, 1fr))",
      [breakpoints.lg]: "repeat(6, minmax(0, 1fr))",
    },
  },
  insetStage: {
    backgroundColor: color.bgSurface,
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
  // Lift and shadow move together — one style per rung of the scale.
  level1: { boxShadow: shadow._1, transform: "translateY(0)" },
  level2: { boxShadow: shadow._2, transform: "translateY(-2px)" },
  level3: { boxShadow: shadow._3, transform: "translateY(-5px)" },
  level4: { boxShadow: shadow._4, transform: "translateY(-9px)" },
  level5: { boxShadow: shadow._5, transform: "translateY(-14px)" },
  level6: { boxShadow: shadow._6, transform: "translateY(-20px)" },
  // The well stays flush with the floor and takes the sunken tone, so the inset
  // shadow reads as depth below the ground rather than above it. It spans the
  // plaque because the shadow is a hairline along the top edge — a 56px square
  // gives it too little edge to read against.
  wellTile: {
    inlineSize: "100%",
    boxShadow: shadow.inset,
    backgroundColor: color.bgSurfaceSunken,
  },
  caption: {
    display: "flex",
    flexDirection: "column",
    gap: space._0,
    paddingBlock: space._2,
    paddingInline: space._3,
    borderBlockStartWidth: "1px",
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
    minInlineSize: 0,
  },
  usage: {
    fontSize: font.uiCaption,
    color: color.textMuted,
    lineHeight: font.lineHeight_2,
    textWrap: "pretty",
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    color: color.textSubtle,
    lineHeight: font.lineHeight_2,
  },
});
