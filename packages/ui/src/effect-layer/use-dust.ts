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
   * How much dust the element shakes off at once each time it is clicked,
   * also by the keyboard: particles along every 100 px of its edge, at most
   * 256. They fly off its edge fast, die within about two seconds, and an
   * Extractor fan in reach pulls them at once. To shed dust only on a click,
   * give it `density: 0`.
   *
   * @default 0
   * @zh 元素每次被点击（包括用键盘激活）时一次性抖落的灰尘多少：沿边缘每 100 px 的粒子数，最多 256 个。粒子快速飞离边缘，约两秒内消失，范围内的抽风机会立即把它们吸走。若只想在点击时抖落灰尘，设置 `density: 0`。
   */
  burst?: number;
  /**
   * A count of the bursts the element shakes off without a click. Each time
   * the count goes up, the element sheds one more burst of `burst` size from
   * where it is now, as a click does. The layer must already see the
   * element: a step up before the layer first measures it, or while it has
   * `opacity: 0` or `visibility: hidden`, sheds nothing. To shed from an
   * element that does not show, hide it with `filter: opacity(0)`.
   *
   * @default 0
   * @zh 不经点击而抖落的灰尘次数计数。计数每增加一次，元素就从当前位置再抖落一次大小为 `burst` 的灰尘，与一次点击相同。效果层必须已经看到该元素：在效果层首次测量它之前，或它为 `opacity: 0`、`visibility: hidden` 时增加计数，不会抖落灰尘。若要从不可见的元素抖落灰尘，请用 `filter: opacity(0)` 隐藏它。
   */
  shakes?: number;
  /**
   * Where the dust goes once shed. `"viewport"` keeps it in its place on the
   * screen while the page scrolls, so it lives on wherever the element
   * scrolls to, such as when a click on a link scrolls the page. Without
   * it, the dust moves with the element's Effect carrier.
   *
   * @zh 灰尘散出后所在的位置。`"viewport"` 让灰尘在页面滚动时停留在屏幕上的原位，因此无论元素滚动到哪里，灰尘都会继续存在，例如点击链接让页面滚动时。不设置时，灰尘随元素的效果载体移动。
   */
  carrier?: "viewport";
}

/**
 * Sheds dust from an element's edge, in the element's own fill colour:
 * attach the returned ref to the element. The particles float off like dust
 * in still air, then speed up towards any element with `useExtractorFan` in
 * reach and vanish at its edge; with none in reach they drift and fade. They
 * flow around other registered elements, and a moving pointer stirs them.
 * The dust of an element on the viewport, under `<EffectCarrier
 * value="viewport">` or in a portal, or with `carrier: "viewport"`, stays in
 * its place on the screen while the page scrolls, and lives on after the
 * element goes. Under reduced motion the particles hold still around an
 * element with a density above 0, and a burst sheds nothing. The element
 * needs a box of its own, so not `display: contents`. Outside an
 * `EffectLayerProvider` the ref does nothing.
 */
export function useDust({
  density = EFFECT_SETTING_DEFAULTS.dust.density,
  burst = EFFECT_SETTING_DEFAULTS.dust.burst,
  shakes = EFFECT_SETTING_DEFAULTS.dust.shakes,
  carrier,
}: DustOptions = {}) {
  return useEffectRegistration(density > 0 || burst > 0 ? DUST : 0, {
    dust: { density, burst, shakes, carrier },
  });
}
