import { t } from "#src/i18n.ts";
import { GuideList } from "../../guide/guide-list.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";

/**
 * The models the palette is built on, each defined in plain words and then
 * tied to what it does for the hues and tones. Sits after the token showcases
 * with the contrast section, so the tokens come first.
 */
export function BalanceShowcase() {
  return (
    <Showcase
      label={t({ en: "Hue and tone balance", zh: "色相与色调的平衡" })}
      frame="plain"
    >
      <ShowcaseHelper>
        {t({
          en: "The palette is thirteen hues at twenty-one tones. What holds it together is that a tone means the same brightness in every hue, and that a hue keeps its identity at every tone. These are the models and the checks that make that true.",
          zh: "调色板是十三种色相乘以二十一级色调。让它成为一个整体的是：同一色调在每种色相中亮度相同，每种色相在每一级色调上都保持本色。下面是实现这一点所依据的模型与检验。",
        })}
      </ShowcaseHelper>
      <GuideList
        items={[
          {
            term: "HCT",
            value: t({ en: "Hue, chroma, tone", zh: "色相、彩度、色调" }),
            note: t({
              en: "The colour model behind Material 3, and the one each hue is expanded in. Hue is the colour family, chroma is how far it sits from grey, and tone is its lightness from 0 to 100, so a colour can move along one axis while the other two hold still. Hue and chroma come from CAM16, a model of how a colour appears to a viewer rather than how much light it reflects, and tone comes from CIE L*.",
              zh: "Material 3 所用的颜色模型，每种色相都在其中展开。色相是颜色的家族，彩度是它离灰有多远，色调是 0 到 100 的明度，因此可以沿一个轴移动颜色而另外两个轴不变。色相与彩度来自 CAM16，一个描述颜色在观看者眼中如何呈现、而非反射多少光的模型；色调来自 CIE L*。",
            }),
          },
          {
            term: "CIE L*",
            value: t({
              en: "Lightness from luminance",
              zh: "由亮度得出的明度",
            }),
            note: t({
              en: "The lightness scale of CIELAB, from 0 for black to 100 for white, shaped so that equal steps look roughly equal. It depends on luminance alone, and that is where it falls short: a saturated blue and a grey with the same luminance get the same L*, and the eye sees the blue as brighter.",
              zh: "CIELAB 的明度刻度，0 为黑、100 为白，经整形使相等的步长看起来大致相等。它只取决于亮度，这正是它的不足：同等亮度的饱和蓝与灰会得到同样的 L*，而眼睛看到的蓝更亮。",
            }),
          },
          {
            term: t({
              en: "Helmholtz–Kohlrausch effect",
              zh: "Helmholtz–Kohlrausch 效应",
            }),
            value: t({
              en: "Saturation reads as brightness",
              zh: "饱和读作明亮",
            }),
            note: t({
              en: "The effect L* leaves out. A colourful colour looks brighter than a grey of the same luminance, strongly for blues and purples and barely for yellows. Left uncorrected, yellow and green read dim and indigo reads bright at the same tone.",
              zh: "L* 遗漏的那个效应。有彩色的颜色看起来比同等亮度的灰更亮，蓝与紫尤甚，黄则很弱。若不修正，同一色调下黄与绿显得暗、靛显得亮。",
            }),
          },
          {
            term: t({
              en: "Hellwig 2022 lightness",
              zh: "Hellwig 2022 明度",
            }),
            value: t({
              en: "CAM16 with the Helmholtz–Kohlrausch term",
              zh: "加入 Helmholtz–Kohlrausch 项的 CAM16",
            }),
            note: t({
              en: "A lightness measure published by Hellwig and Fairchild in 2022 that adds the effect to CAM16. The palette uses it as the ruler: each hue's tone is solved so its Hellwig lightness equals Gray's at that tone, and a test holds the spread across the thirteen hues under one unit. Gray is the reference and the source of every neutral token, a warm grey of chroma about 2.4. Black and white are pinned, because near white the term of a tinted colour exceeds white's own.",
              zh: "Hellwig 与 Fairchild 于 2022 年发表的明度度量，在 CAM16 上加入了该效应。调色板以它为尺：每种色相的每一级都经求解，使其 Hellwig 明度等于 Gray 在同一级的明度，测试保证十三种色相之间的差距小于一个单位。Gray 既是基准，也是所有中性令牌的来源，一种彩度约 2.4 的暖灰。黑与白固定不动，因为接近白色时，带色颜色的该项会超过白色本身。",
            }),
          },
          {
            term: t({ en: "Tone scale", zh: "色调刻度" }),
            value: t({
              en: "21 tones, denser at the ends",
              zh: "21 级，两端更密",
            }),
            note: t({
              en: "From 20 to 80 the tones follow the Material 3 grid of ten, where the coloured roles live. Extra tones at 2, 5, 7, 9, 11 and 13, and at 92, 95, 97, 98 and 99, give dark and light surfaces steps of their own inside the palette rather than in a separately tuned set.",
              zh: "20 到 80 之间沿用 Material 3 的十进网格，彩色角色都在这一段。2、5、7、9、11、13 与 92、95、97、98、99 这些额外的级，让深色与浅色表面的层级留在调色板内部，而不是另调一套。",
            }),
          },
          {
            term: t({ en: "sRGB gamut", zh: "sRGB 色域" }),
            value: t({
              en: "The colours a standard screen can show",
              zh: "普通屏幕能显示的颜色范围",
            }),
            note: t({
              en: "Not every hue reaches every tone at its full chroma. Where a colour falls outside sRGB, it keeps as much chroma as fits on the hue's own tint. Near white, where HCT's solver falls back to an over-tinted or off-hue colour, the tint is placed in CAM16 directly, walking out from grey along the hue until the gamut ends. A test holds every colour within 45° of its source hue and no more tinted than its source.",
              zh: "并非每种色相都能以全彩度达到每一级色调。颜色超出 sRGB 时，在本色相的方向上保留能容纳的最大彩度。接近白色时，HCT 的求解器会退回到彩度过高或偏离色相的颜色，于是直接在 CAM16 中放置：从灰出发，沿本色相向外走到色域边界为止。测试保证每个颜色与其源色相的偏差在 45° 以内，彩度也不超过源色。",
            }),
          },
        ]}
      />
    </Showcase>
  );
}
