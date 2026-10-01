import { Spinner } from "@tuja/ui/components/spinner";

/**
 * One spinner. Three side by side only showed that the size prop exists, while
 * putting three competing rotations in one tile.
 *
 * `aria-hidden` rather than `label`: the specimen is inert decoration, so a busy
 * announcement here would be noise.
 *
 * It holds still until its tile is engaged, but nothing here has to say so: the
 * plate sets `motionTokens.playState` and the spin inherits it.
 */
export function SpinnerSpecimen() {
  return <Spinner size="lg" tone="accent" aria-hidden />;
}
