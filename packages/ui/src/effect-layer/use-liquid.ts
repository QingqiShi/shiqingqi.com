import { roleBits } from "./effect-roles.ts";
import { EFFECT_SETTING_DEFAULTS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const LIQUID = roleBits(["liquid"]);

export interface LiquidOptions {
  /**
   * Where the thumb rests, as a share of the track's travel: 0 at the off
   * end, 1 at the on end, 0.5 in the middle for indeterminate. For an
   * indicator, the index of the selected segment. A new one pours the
   * liquid there.
   *
   * @zh 滑块的静止位置，以轨道行程的比例表示：0 在关闭端，1 在开启端，0.5 在中间表示未定。对指示块而言，它是已选分段的序号：序号一变，液体就涌向新的分段。
   */
  position: number;
  /**
   * Where a drag holds the thumb, as a share of the travel, or `null` while
   * no drag is on. For an indicator, a segment index that can be
   * fractional: between two segments, the liquid is between their pills in
   * place and in length. The liquid follows the pointer with its own
   * inertia.
   *
   * @default null
   * @zh 拖动时滑块所在的位置，以行程的比例表示；未拖动时为 `null`。对指示块而言，它是可以带小数的分段序号：处于两个分段之间时，液体的位置和长度也介于两者之间。液体带着惯性跟随指针。
   */
  drag?: number | null;
  /**
   * A pointer is down on the control. The liquid thaws while it is
   * pressed, and freezes again once it is released and still.
   *
   * @default false
   * @zh 指针正按在控件上。按住时液体融化，松开并静止后重新冻结。
   */
  pressed?: boolean;
  /**
   * Where the press that sent the liquid was across the track, from -1
   * at its top to 1 at its bottom. The liquid leans a little that way as it
   * pours, so it lands higher or lower on the far end, and the ring light
   * starts where it lands. A change with no press point, from a key or a
   * label, aims at 0, the centre line.
   *
   * @default 0
   * @zh 送出液体的那次按压在轨道上的纵向位置，从顶部的 -1 到底部的 1。液体涌过时会略微偏向那一侧，因此落在远端偏上或偏下的位置，环形光从落点开始。没有按压位置的变化（来自按键或标签）以 0，即中线为准。
   */
  aim?: number;
}

/**
 * Draws a Switch's thumb or a segmented control's indicator as liquid on
 * the effect layer, as the Switch's and the SegmentedControl's `effect`
 * prop describes. For a thumb, attach the returned ref to the Switch's
 * `<input>`: its track gives the liquid its room, its `::before` thumb
 * gives the liquid its size and colour, and the colour of its `::after`
 * gives the fill the track takes on a toggle. For an indicator, attach it
 * to the track: each `[role="radio"]` segment gives the liquid a pill to
 * rest in, and the element marked with `data-liquid-indicator` gives its
 * colour, its corners and, with its text colour, the ring light's colour.
 * While the effect draws, the element has the `data-effect-drawn`
 * attribute, so the control hides its own thumb or indicator then and at
 * no other time. Outside an `EffectLayerProvider`, or where the effect
 * layer is off, the ref does nothing.
 */
export function useLiquid({
  position,
  drag = EFFECT_SETTING_DEFAULTS.liquid.drag,
  pressed = EFFECT_SETTING_DEFAULTS.liquid.pressed,
  aim = EFFECT_SETTING_DEFAULTS.liquid.aim,
}: LiquidOptions) {
  return useEffectRegistration(LIQUID, {
    liquid: { position, drag, pressed, aim },
  });
}
