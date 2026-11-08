import { fillTemplate } from "./fill-template.ts";
import { formatTokens } from "./format-tokens.ts";
import { esc, ld, n, paletteCss, svg, svgOpen, todayCss, uid } from "./svg.ts";
import type { PetDay } from "./types.ts";
import type { PetCopy } from "./types.ts";

const TREND_HEIGHT = 84;

function movingAverage(values: readonly number[]) {
  return values.map((_, i) => {
    const win = values.slice(Math.max(0, i - 6), i + 1);
    return win.reduce((a, b) => a + b, 0) / win.length;
  });
}

export function trendStats(values: readonly number[]) {
  return {
    peak: Math.max(0, ...values),
    average: movingAverage(values).at(-1) ?? 0,
  };
}

export function trendSvg(
  width: number,
  days: readonly PetDay[],
  isIntro: boolean,
  copy: PetCopy,
) {
  const W = width;
  const H = TREND_HEIGHT;
  const T = 18;
  const values = days.map((d) => d.tokens);
  const id = uid("trend", W, values.join(","));
  if (values.length === 0) return null;
  const max = Math.max(1, ...values);
  const bw = W / values.length;
  const Y = (v: number) => H - (v / max) * (H - T);
  const avg = movingAverage(values);
  const pts = avg.map((v, i) => [i * bw + bw / 2, Y(v)] as const);
  const line = pts.map(([x, y]) => svg`${n(x)},${n(y)}`).join(" L");
  const last = pts.at(-1) ?? [W, H];
  const step = values.length > 60 ? 0 : 12;
  const bars = values
    .map((v, i) => {
      const h = H - Y(v);
      if (h <= 0) return "";
      const attrs = isIntro
        ? svg` class="bar-${id} pop-${id}" style="animation-delay:${i * step}ms"`
        : svg` class="bar-${id}"`;
      return svg`<rect${attrs} x="${n(i * bw + bw * 0.2)}" y="${n(Y(v))}" width="${n(Math.max(0.6, bw * 0.6))}" height="${n(h)}" rx="${bw > 4 ? 1 : 0}"/>`;
    })
    .join("");
  const stats = trendStats(values);
  const peak = esc(
    fillTemplate(copy.trend.peak, { value: formatTokens(stats.peak) }),
  );
  const now = esc(
    fillTemplate(copy.trend.average, { value: formatTokens(stats.average) }),
  );
  const draw = isIntro ? svg` class="draw-${id}"` : "";
  const intro = isIntro
    ? svg`
.pop-${id}{transform-box:fill-box;transform-origin:center bottom;animation:pop-${id} .35s cubic-bezier(.3,1.6,.5,1) backwards}
@keyframes pop-${id}{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.draw-${id}{stroke-dasharray:1;animation:draw-${id} 1.3s ease-out backwards}@keyframes draw-${id}{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@media (prefers-reduced-motion: reduce){.pop-${id},.draw-${id}{animation:none}}`
    : "";

  return svg`${svgOpen(W, H)}<style>${paletteCss(id)}${intro}
${todayCss(id)}
.clay-${id}{fill:${ld("#B4532F", "#E8906F")}}
</style><defs><linearGradient id="ar-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D97757" stop-opacity=".45"/><stop offset="1" stop-color="#D97757" stop-opacity="0"/></linearGradient></defs>
${bars}
<path d="M${n(pts[0]?.[0] ?? 0)},${H} L${line} L${n(last[0])},${H}Z" fill="url(#ar-${id})"/>
<path${draw} d="M${line}" fill="none" stroke="#F0997B" stroke-width="5" stroke-opacity=".25" stroke-linejoin="round" stroke-linecap="round" pathLength="1"/>
<path${draw} d="M${line}" fill="none" stroke="#D97757" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" pathLength="1"/>
<circle class="tdr-${id}" cx="${n(Math.min(W - 4, last[0]))}" cy="${n(last[1])}" r="3" stroke="#D97757"/><circle cx="${n(Math.min(W - 4, last[0]))}" cy="${n(last[1])}" r="3" fill="#D97757"/>
<text x="0" y="11" font-size="11" class="t3-${id}">${peak}</text><text x="${W}" y="11" text-anchor="end" font-size="11" class="clay-${id}">${now}</text>
</svg>`;
}
