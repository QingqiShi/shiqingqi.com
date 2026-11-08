import { mergeTotals } from "./calendar.ts";
import { fillTemplate } from "./fill-template.ts";
import { formatLines } from "./format-tokens.ts";
import {
  esc,
  ld,
  n,
  paletteCss,
  svg,
  svgOpen,
  textWidth,
  todayCss,
  uid,
} from "./svg.ts";
import type { PetMergeDay } from "./types.ts";
import type { PetCopy } from "./types.ts";

const MERGES_HEIGHT = 96;

export function mergesSvg(
  width: number,
  days: readonly PetMergeDay[],
  isIntro: boolean,
  copy: PetCopy,
) {
  const W = width;
  const H = MERGES_HEIGHT;
  const T = 18;
  const D = 12;
  const id = uid(
    "merges",
    W,
    days.map((d) => svg`${d.prs}:${d.additions}:${d.deletions}`).join(","),
  );
  if (days.length === 0) return null;
  const base = H - D - 3;
  const peak = Math.sqrt(
    Math.max(0, ...days.map((d) => d.additions + d.deletions)),
  );
  const scale = peak > 0 ? (base - T) / peak : 0;
  const bw = W / days.length;
  const prMax = Math.max(1, ...days.map((d) => d.prs));
  const step = days.length > 60 ? 0 : 12;
  const last = days.length - 1;
  const x0 = (i: number) => n(i * bw + bw * 0.2);
  const w = n(Math.max(0.6, bw * 0.6));
  const r = bw > 4 ? 1 : 0;
  const now = (i: number) => (i === last ? svg` now-${id}` : "");
  const cx = (i: number) => n(Math.min(W - 4, i * bw + bw / 2));
  const delay = (i: number) =>
    isIntro ? svg` style="animation-delay:${i * step}ms"` : "";
  const segment = (
    cls: string,
    i: number,
    y: number,
    h: number,
    isTop: boolean,
  ) => {
    const c = svg`${cls}-${id}${now(i)}`;
    if (!isTop || r === 0 || h < 2 * r)
      return svg`<rect class="${c}" x="${x0(i)}" y="${n(y)}" width="${w}" height="${n(h)}"/>`;
    const x = x0(i);

    return svg`<path class="${c}" d="M${x},${n(y + h)}V${n(y + r)}Q${x},${n(y)} ${n(x + r)},${n(y)}H${n(x + w - r)}Q${n(x + w)},${n(y)} ${n(x + w)},${n(y + r)}V${n(y + h)}Z"/>`;
  };
  const dotY = H - D / 2;
  let marks = svg`<rect class="bg-${id}" x="${n(last * bw)}" y="${T - 4}" width="${n(bw)}" height="${H - T + 4}" rx="2"/>`;
  for (const [i, d] of days.entries()) {
    const total = d.additions + d.deletions;
    if (total > 0) {
      const h = Math.max(1.5, Math.sqrt(total) * scale);
      const add = (h * d.additions) / total;
      const bar =
        segment("add", i, base - add, add, d.deletions === 0) +
        (d.deletions === 0 ? "" : segment("del", i, base - h, h - add, true));
      marks += svg`<g${isIntro ? svg` class="up-${id}"` : ""}${delay(i)}>${bar}</g>`;
    }
    if (d.prs > 0) {
      const radius = n(
        Math.min(bw * 0.42, 1.4 + 2.6 * Math.sqrt(d.prs / prMax)),
      );
      marks += svg`<circle class="pr-${id}${now(i)}${isIntro ? svg` pop-${id}` : ""}"${delay(i)} cx="${cx(i)}" cy="${dotY}" r="${radius}"/>`;
    }
  }
  const today = days.at(-1);
  const todayX = cx(last);
  const empty =
    today !== undefined && today.prs > 0
      ? ""
      : svg`<circle class="prs-${id}" cx="${todayX}" cy="${dotY}" r="2.5" fill="none" stroke-width="1"/>`;
  const pulse = svg`${empty}<circle class="prs-${id} tdr-${id}" cx="${todayX}" cy="${dotY}" r="3"/>`;
  const sum = mergeTotals(days);
  const keys = [
    {
      cls: svg`add-${id}`,
      label: copy.merges.added,
      value: svg`+${formatLines(sum.additions)}`,
      isDot: false,
    },
    {
      cls: svg`del-${id}`,
      label: copy.merges.deleted,
      value: svg`−${formatLines(sum.deletions)}`,
      isDot: false,
    },
    { cls: svg`pr-${id}`, label: copy.merges.prs, value: "", isDot: true },
  ];
  let legend = "";
  let lx = 0;
  for (const k of keys) {
    legend += k.isDot
      ? svg`<circle class="${k.cls}" cx="${n(lx + 5)}" cy="7" r="4"/>`
      : svg`<rect class="${k.cls}" x="${n(lx)}" y="2" width="10" height="10" rx="2.5"/>`;
    const text = k.value === "" ? k.label : svg`${k.label} ${k.value}`;
    legend += svg`<text x="${n(lx + 13)}" y="11" font-size="11" class="t3-${id}">${esc(k.label)}${k.value === "" ? "" : svg`<tspan class="t2-${id}"> ${esc(k.value)}</tspan>`}</text>`;
    lx += 13 + textWidth(text, 11) + 10;
  }
  const legendRight = lx - 10;
  const parts: Array<Array<[string, string]>> =
    today === undefined || today.prs === 0
      ? [[[svg`t3-${id}`, copy.merges.noneToday]]]
      : [
          [
            [svg`prt-${id}`, fillTemplate(copy.merges.today, { n: today.prs })],
            [svg`addt-${id}`, svg` +${formatLines(today.additions)}`],
            [svg`delt-${id}`, svg` −${formatLines(today.deletions)}`],
          ],
          [[svg`prt-${id}`, fillTemplate(copy.merges.today, { n: today.prs })]],
        ];
  const fit = parts.find(
    (p) => legendRight + 12 + textWidth(p.map(([, t]) => t).join(""), 11) <= W,
  );
  const right =
    fit === undefined
      ? ""
      : svg`<text x="${W}" y="11" text-anchor="end" font-size="11">${fit.map(([cls, t]) => svg`<tspan class="${cls}">${esc(t)}</tspan>`).join("")}</text>`;
  const motion = isIntro
    ? svg`
.up-${id}{transform-box:fill-box;transform-origin:center bottom;animation:grow-${id} .4s cubic-bezier(.3,1.5,.5,1) backwards}
@keyframes grow-${id}{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.pop-${id}{transform-box:fill-box;transform-origin:center;animation:pop-${id} .35s cubic-bezier(.3,1.6,.5,1) .2s backwards}
@keyframes pop-${id}{from{transform:scale(0)}to{transform:scale(1)}}
@media (prefers-reduced-motion: reduce){.up-${id},.pop-${id}{animation:none}}`
    : "";

  return svg`${svgOpen(W, H)}<style>${paletteCss(id)}
.add-${id},.addt-${id}{fill:${ld("#1A7F37", "#3FB950")}}.del-${id},.delt-${id}{fill:${ld("#CF222E", "#F85149")}}.pr-${id}{fill:${ld("#8250DF", "#A371F7")}}
.add-${id},.del-${id}{opacity:.7}.pr-${id}{opacity:.8}.now-${id}{opacity:1}
.prt-${id}{fill:${ld("#6639BA", "#C4A5FA")}}.axis-${id}{stroke:${ld("rgba(0,0,0,0.14)", "rgba(255,255,255,0.16)")}}.prs-${id}{stroke:${ld("#8250DF", "#A371F7")}}${motion}
${todayCss(id)}
</style>${legend}${right}<line class="axis-${id}" x1="0" x2="${W}" y1="${base + 0.5}" y2="${base + 0.5}" stroke-width="1"/>${marks}${pulse}</svg>`;
}
