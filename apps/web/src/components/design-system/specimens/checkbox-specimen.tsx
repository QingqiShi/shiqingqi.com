import * as stylex from "@stylexjs/stylex";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * Checked and empty — the pair that reads as a group at a glance. The
 * indeterminate box is a third state that needs its siblings visible to make
 * sense, so it belongs on the checkbox page rather than in a two-row sample.
 *
 * `defaultChecked` keeps the native input uncontrolled, so React never asks for
 * the `onChange` an inert specimen has no use for.
 */
export function CheckboxSpecimen() {
  return (
    <div css={[specimenLayout.stack, styles.group]}>
      <Checkbox
        size="sm"
        defaultChecked
        label={t({ en: "Now playing", zh: "正在上映" })}
      />
      <Checkbox size="sm" label={t({ en: "Upcoming", zh: "即将上映" })} />
    </div>
  );
}

const styles = stylex.create({
  // Opts out of `stack`'s row centring, which is written for the prose samples:
  // two labels of different lengths, each centred, put the two boxes at
  // different offsets, and a checkbox group whose boxes don't line up is not
  // reading as a group. Both properties, because `text-align` inherits past the
  // rows this unsets while `align-items` does not.
  //
  // The group as a whole is still centred on the plate, by the specimen wrapper
  // above this element — but only while it fits. Squeeze the plate far enough
  // (a 260px column at a much larger root font size) and a label wraps, the
  // group's box stretches to the plate, and these two rows are pinned to its
  // inline start with no wrapper declaration able to pull them back. Accepted:
  // at that size the labels are wrapping anyway, and boxes that line up at every
  // ordinary width is worth more than a centred group at the extreme.
  group: {
    alignItems: "flex-start",
    textAlign: "start",
  },
});
