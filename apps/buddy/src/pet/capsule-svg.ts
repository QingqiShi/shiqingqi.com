import { fillTemplate } from "./fill-template.ts";
import { esc, ld, n, paletteCss, svg, svgOpen, textWidth, uid } from "./svg.ts";
import type { PetCopy } from "./types.ts";

const QUOTA_LEVELS = {
  ok: { from: "#34D399", to: "#22D3EE", ink: "#06302A" },
  warn: { from: "#FBBF24", to: "#F97316", ink: "#3A1D02" },
  over: { from: "#FB7185", to: "#E11D48", ink: "#FFF1F2" },
} as const;

type QuotaLevel = keyof typeof QUOTA_LEVELS;

export function levelOf(pct: number, projected: number | null): QuotaLevel {
  const worst = Math.max(pct, projected ?? 0);
  if (worst > 100) return "over";
  if (worst >= 85) return "warn";

  return "ok";
}

const CAPSULE_HEIGHT = 22;

export function capsuleSvg(
  width: number,
  pct: number,
  projected: number | null,
  copy: PetCopy,
) {
  const W = width;
  const H = CAPSULE_HEIGHT;
  const level = levelOf(pct, projected);
  const { from, to, ink } = QUOTA_LEVELS[level];
  const fill = Math.max(10, Math.min(W, (W * Math.min(100, pct)) / 100));
  const fc = projected === null ? null : Math.max(pct, projected);
  const fcX = fc === null ? fill : Math.min(W, (W * Math.min(100, fc)) / 100);
  const isOver = fc !== null && fc > 100;
  const fcColor = isOver ? "#FB7185" : from;
  const id = uid("cap", W, pct, Math.round(fc ?? -1), level);
  const label = svg`${Math.round(pct)}%`;
  const isOut = pct >= 100;
  const end = isOut
    ? copy.capsule.out
    : fc === null
      ? ""
      : isOver
        ? fillTemplate(copy.capsule.over, { pct: Math.round(fc - 100) })
        : svg`→ ${Math.round(fc)}%`;
  const endWidth = textWidth(end, 12);
  const hasPill = end !== "" && (isOut || isOver || fcX > W - endWidth - 18);
  const isLabelInside = fill >= textWidth(label, 12) + 16;
  const wave = (edge: number) =>
    svg`M0 -20H${n(edge)}q3 2.5 0 5${"t0 5".repeat(11)}V44H0Z`;

  return svg`${svgOpen(W, H)}<style>${paletteCss(id)}
.wv-${id}{animation:wv-${id} 1.2s linear infinite}.wb-${id}{animation:wv-${id} 1.9s linear infinite reverse}
.sh-${id}{animation:sh-${id} 2.6s ease-in-out infinite}.ov-${id}{animation:ov-${id} 1s ease-in-out infinite}
.end-${id}{fill:${ld("#5e5d59", "#a6a39b")}}
.endo-${id}{fill:${ld("#BE123C", "#FDA4AF")};animation:ov-${id} 1s ease-in-out infinite}.pill-${id}{fill:${ld("#ffffff", "#262624")};opacity:.88}
@keyframes wv-${id}{to{transform:translateY(-10px)}}
@keyframes sh-${id}{0%{transform:translateX(0)}70%,100%{transform:translateX(${n(fill + 36)}px)}}
@keyframes ov-${id}{0%,100%{opacity:.35}50%{opacity:1}}
@media (prefers-reduced-motion: reduce){.wv-${id},.wb-${id},.ov-${id},.endo-${id}{animation:none}.sh-${id}{animation:none;opacity:0}.st-${id}{display:none}}
</style><defs><clipPath id="c-${id}"><rect width="${W}" height="${H}" rx="${H / 2}"/></clipPath><clipPath id="f-${id}"><rect width="${n(fill - 1)}" height="${H}"/></clipPath><linearGradient id="g-${id}" x1="0" x2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient><linearGradient id="s-${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><pattern id="p-${id}" width="8" height="${H}" patternUnits="userSpaceOnUse" patternTransform="skewX(-35)"><rect width="3.5" height="${H}" fill="${fcColor}" opacity=".55"/><animateTransform class="st-${id}" attributeName="patternTransform" type="translate" from="0 0" to="8 0" dur=".9s" repeatCount="indefinite" additive="sum"/></pattern></defs>
<rect class="tr-${id}" width="${W}" height="${H}" rx="${H / 2}"/>
<g clip-path="url(#c-${id})">${fcX > fill ? svg`<rect x="${n(fill)}" width="${n(fcX - fill)}" height="${H}" fill="url(#p-${id})"/>` : ""}${isOver ? svg`<rect class="ov-${id}" x="${W - 18}" width="18" height="${H}" fill="#FB7185"/>` : ""}<path class="wb-${id}" d="${wave(fill + 3)}" fill="${to}" opacity=".45"/><path class="wv-${id}" d="${wave(fill - 1)}" fill="url(#g-${id})"/><g clip-path="url(#f-${id})"><rect class="sh-${id}" x="-36" width="36" height="${H}" fill="url(#s-${id})"/></g></g>
<text x="${isLabelInside ? 10 : n(fill + 6)}" y="15.5" font-size="12" font-weight="500" ${isLabelInside ? svg`fill="${ink}"` : svg`class="t1-${id}"`}>${label}</text>
${fc === null || fcX <= fill + 1 ? "" : svg`<line x1="${n(fcX - 0.75)}" x2="${n(fcX - 0.75)}" y1="3" y2="${H - 3}" stroke="${fcColor}" stroke-width="1.5" stroke-dasharray="2 2"/>`}
${hasPill ? svg`<rect class="pill-${id}" x="${n(W - endWidth - 17)}" y="3" width="${n(endWidth + 14)}" height="${H - 6}" rx="${(H - 6) / 2}"/>` : ""}
${end === "" ? "" : svg`<text x="${W - 10}" y="15.5" text-anchor="end" font-size="12" font-weight="500" class="${isOver || isOut ? svg`endo-${id}` : svg`end-${id}`}">${esc(end)}</text>`}
</svg>`;
}
