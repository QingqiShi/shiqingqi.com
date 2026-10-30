import { roleBits } from "./effect-roles.ts";
import { EFFECT_SETTING_DEFAULTS } from "./effect-setting-defaults.ts";
import { useEffectRegistration } from "./use-effect-registration.ts";

const DUST = roleBits(["dust"]);

export interface DustOptions {
  /**
   * How much dust the element sheds: particles a second along every 100 px
   * of its edge. It sheds more while an Extractor fan pulls at it or a
   * pointer is near it. At 0 it sheds nothing, and with no `burst` the
   * element is an Effect boundary until the density goes up.
   *
   * @default 3
   * @zh 元素散出灰尘的多少：沿边缘每 100 px 每秒的粒子数。当抽风机在吸它、或指针靠近它时，散出的灰尘会更多。为 0 且没有 `burst` 时，元素在密度升高前是一个效果边界。
   */
  density?: number;
  /**
   * How many particles the element shakes off at once when it joins the
   * effect layer, at most 256. They fly off its edge fast, die within about
   * two seconds, and an Extractor fan in reach pulls them at once. To shake
   * off dust on demand, such as on a press, mount the element then, give it
   * `density: 0`, and remove it in `onShed`.
   *
   * @default 0
   * @zh 元素加入效果层时一次性抖落的粒子数，最多 256。粒子快速飞离边缘，约两秒内消失，范围内的抽风机会立即把它们吸走。要按需抖落灰尘（例如在按下时），就在那时挂载元素，设置 `density: 0`，并在 `onShed` 中移除它。
   */
  burst?: number;
  /**
   * Which colour of the element the dust takes: `"fill"`, its background
   * colour, or `"text"`, its CSS `color`. Use `"text"` for an element with no
   * fill of its own, such as a clear box over another element.
   *
   * @default "fill"
   * @zh 灰尘取元素的哪种颜色：`"fill"` 为背景色，`"text"` 为 CSS `color`。没有自身填充的元素（例如盖在另一个元素上的透明盒子）用 `"text"`。
   */
  colorFrom?: "fill" | "text";
  /**
   * Runs once the element has shed all of its `burst`, or has dropped it
   * under reduced motion. Its dust lives on without it, so the element can
   * go then.
   *
   * @zh 元素抖落完全部 `burst`（或在减少动态效果的设置下放弃抖落）后调用一次。之后灰尘不再依赖该元素，元素可以移除。
   */
  onShed?: () => void;
}

/**
 * Sheds dust from an element's edge, in the element's own fill colour or
 * text colour: attach the returned ref to the element. The particles float
 * off like dust in still air, then speed up towards any element with
 * `useExtractorFan` in reach and vanish at its edge; with none in reach they
 * drift and fade. They flow around other registered elements, and a moving
 * pointer stirs them.
 * The dust of an element on the viewport, under `<EffectCarrier
 * value="viewport">` or in a portal, stays in its place on the screen while
 * the page scrolls, and lives on after the element goes. Under reduced motion
 * the particles hold still around an element with a density above 0, and a
 * burst sheds nothing. The element needs a box of its own, so not
 * `display: contents`. Outside an `EffectLayerProvider` the ref does
 * nothing.
 */
export function useDust({
  density = EFFECT_SETTING_DEFAULTS.dust.density,
  burst = EFFECT_SETTING_DEFAULTS.dust.burst,
  colorFrom = EFFECT_SETTING_DEFAULTS.dust.colorFrom,
  onShed,
}: DustOptions = {}) {
  return useEffectRegistration(density > 0 || burst > 0 ? DUST : 0, {
    dust: { density, burst, colorFrom, onShed },
  });
}
