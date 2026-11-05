import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { font, opacity, space } from "@tuja/ui/tokens.stylex";

export const actionRowStyles = stylex.create({
  button: {
    paddingBlock: space._2,
    paddingInline: space._3,
    backgroundColor: {
      default: color.bgSurface,
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgControlHover,
      },
      ":focus-visible": color.bgControlHover,
    },
    color: color.fg,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.border,
    cursor: {
      default: "pointer",
      ":disabled": "not-allowed",
    },
    opacity: {
      default: 1,
      ":disabled": opacity.disabled,
    },
    fontWeight: font.weight_6,
  },
  buttonPrimary: {
    backgroundColor: {
      default: color.bgAccent,
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgAccentHover,
      },
      ":focus-visible": color.bgAccentHover,
    },
    color: color.fgOnAccent,
    borderColor: color.borderAccent,
  },
  ephemeral: {
    margin: 0,
    paddingBlock: space._1,
    paddingInline: space._3,
    backgroundColor: color.bgSurface,
    color: color.fg,
    alignSelf: "center",
    textAlign: "center",
    maxInlineSize: "32rem",
  },
  ephemeralError: {
    color: color.fg,
    backgroundColor: color.bgSurfaceRaised,
  },
});
