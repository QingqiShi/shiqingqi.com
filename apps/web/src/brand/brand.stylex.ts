import * as stylex from "@stylexjs/stylex";
import { cyan } from "@tuja/ui/palette/cyan.stylex";
import { green } from "@tuja/ui/palette/green.stylex";
import { indigo } from "@tuja/ui/palette/indigo.stylex";
import { orange } from "@tuja/ui/palette/orange.stylex";
import { pink } from "@tuja/ui/palette/pink.stylex";
import { purple } from "@tuja/ui/palette/purple.stylex";

// Project and partner identities, each the nearest system-palette swatch to
// the brand's own colour. External brands (Spotify, TMDB) accept minor drift
// from their exact identity colour in exchange for palette consistency. They
// live with the app rather than in `@tuja/ui`, because an identity belongs to
// its owner and not to the design system.
export const brand = stylex.defineVars({
  tmdb: `light-dark(${cyan._60}, ${cyan._70})`,
  calculator: orange._50,
  citadel: `light-dark(${indigo._30}, ${indigo._70})`,
  wtcPlus: pink._60,
  wtcLetter: `light-dark(${indigo._40}, ${indigo._70})`,
  bristol: `light-dark(${pink._30}, ${pink._50})`,
  nottingham: `light-dark(${cyan._30}, ${cyan._60})`,
  spotify: green._60,
  studentLoan: `light-dark(${green._50}, ${green._60})`,
  pixelCreatureCreator: `light-dark(${purple._50}, ${purple._70})`,
});
