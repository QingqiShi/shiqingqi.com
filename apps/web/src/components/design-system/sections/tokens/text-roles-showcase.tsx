import type { StyleXStyles } from "@stylexjs/stylex";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { gridlineGround } from "../../gridline-ground.stylex.ts";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";

/**
 * The three text roles, rendered as actual text on both grounds they are tuned
 * for — the canvas the page scaffolds with and the surface a card body uses.
 */
export function TextRolesShowcase() {
  return (
    <Showcase label={t({ en: "Text", zh: "文字" })} frame="plain">
      <ShowcaseHelper>
        {t({
          en: "Three roles carry every word on a canvas or surface ground — Main for content, Muted for supporting copy, Subtle for captions and labels. Inverse and bright grounds use their own textOn* tokens instead.",
          zh: "画布与表面之上的所有文字由三个角色承担——主要用于内容，次级用于辅助文案，暗淡用于说明与标签。反相与明亮的底面则改用各自的 textOn* 令牌。",
        })}
      </ShowcaseHelper>
      <div css={[gridlineGround.base, styles.grid]}>
        <GroundCell
          name={t({ en: "Canvas", zh: "画布" })}
          fill={styles.fillCanvas}
        />
        <GroundCell
          name={t({ en: "Surface", zh: "表面" })}
          fill={styles.fillSurface}
        />
      </div>
    </Showcase>
  );
}

function GroundCell({ name, fill }: { name: string; fill: StyleXStyles }) {
  return (
    <div css={[styles.cell, fill]}>
      <span css={styles.ground}>{name}</span>
      <div css={styles.roles}>
        <TextRole
          token="color.textMain"
          roleStyle={styles.roleMain}
          sample={t({
            en: "Main — headings and body copy.",
            zh: "主要——标题与正文。",
          })}
        />
        <TextRole
          token="color.textMuted"
          roleStyle={styles.roleMuted}
          sample={t({
            en: "Muted — intros and supporting copy.",
            zh: "次级——引言与辅助文案。",
          })}
        />
        <TextRole
          token="color.textSubtle"
          roleStyle={styles.roleSubtle}
          sample={t({
            en: "Subtle — captions and labels.",
            zh: "暗淡——说明与标签。",
          })}
        />
      </div>
    </div>
  );
}

interface TextRoleProps {
  token: string;
  sample: string;
  roleStyle: StyleXStyles;
}

// Both the sample line and its token name take the role's colour, so the step
// between the three roles is the only thing the specimen varies.
function TextRole({ token, sample, roleStyle }: TextRoleProps) {
  return (
    <div css={styles.role}>
      <span css={[styles.sample, roleStyle]}>{sample}</span>
      <span css={[styles.token, roleStyle]}>{token}</span>
    </div>
  );
}

const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(2, minmax(0, 1fr))",
    },
    gap: space._00,
  },
  cell: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
    paddingBlock: space._4,
    paddingInline: space._4,
    minInlineSize: 0,
  },
  fillCanvas: { backgroundColor: color.bgCanvas },
  fillSurface: { backgroundColor: color.bgSurface },
  ground: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_7,
    letterSpacing: font.trackingWider,
    textTransform: "uppercase",
    color: color.textMain,
  },
  roles: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
  },
  role: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    minInlineSize: 0,
  },
  sample: {
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_3,
    textWrap: "pretty",
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiOverline,
    lineHeight: font.lineHeight_2,
    overflowWrap: "anywhere",
  },
  roleMain: { color: color.textMain },
  roleMuted: { color: color.textMuted },
  roleSubtle: { color: color.textSubtle },
});
