import * as stylex from "@stylexjs/stylex";
import { space } from "@tuja/ui/tokens.stylex";

/**
 * A scroll region that goes into the `space._7` padding of a Showcase card,
 * so its content blurs out at the edge of the card. Put `region` on the
 * region and `content` on its scroller: the padding of the scroller keeps
 * the content in line with the text of the card.
 */
export const showcaseBleed = stylex.create({
  region: {
    marginInline: `calc(-1 * ${space._7})`,
    maxInlineSize: `calc(100% + 2 * ${space._7})`,
  },
  content: {
    paddingInline: space._7,
  },
});
