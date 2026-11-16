import { n, svg } from "./svg.ts";

/** How long the wind takes from one gust to the next, in seconds. */
export const BREEZE_S = 7.3;
/** How far left of the window a cloud starts, so that it comes in from outside. */
export const CLOUD_LEAD = 140;

/** A pose of the pet: how far up it is, how wide and how tall, and how far it leans. */
function pose(up: number, wide: number, tall: number, lean = 0) {
  return svg`transform:translateY(${-up}px) rotate(${lean}deg) scale(${wide},${tall})`;
}

/** The same keyframes under two names. A move that plays again takes the other name, and that starts it again. */
function twice(name: string, id: string, frames: string) {
  return svg`@keyframes ${name}a-${id}{${frames}}@keyframes ${name}b-${id}{${frames}}`;
}

function bothTakes(name: string, id: string, rule: string) {
  return svg`.${name}a-${id}{animation:${name}a-${id} ${rule}}.${name}b-${id}{animation:${name}b-${id} ${rule}}`;
}

/** Fast at the start and slow at the end, as a thing that goes up. */
const RISE = "cubic-bezier(.15,.6,.35,1)";
/** Slow at the start and fast at the end, as a thing that falls. */
const FALL = "cubic-bezier(.6,0,.85,.45)";
const RISES = svg`animation-timing-function:${RISE}`;
const FALLS = svg`animation-timing-function:${FALL}`;

/**
 * The motion follows the principles of hand-drawn animation. The body squashes and stretches from
 * its feet and keeps its volume; a jump starts with a crouch and ends with a squash; the crown and
 * the bubble move after the body; things speed up and slow down, and nothing moves at one speed
 * but the clouds. The loops have lengths that do not divide each other, so the pet does not repeat
 * itself for minutes. `lift` is how far the pet pushes the bubble up when it hops under it.
 */
export function sceneCss(id: string, W: number, H: number, lift: number) {
  const hop = svg`0%{${pose(0, 1, 1)}}10%{${pose(0, 1.13, 0.83)};${RISES}}19%{${pose(1.6, 0.9, 1.14)};${RISES}}37%{${pose(5.4, 1.02, 0.98)};${FALLS}}53%{${pose(1.2, 0.93, 1.1)}}58%{${pose(0, 1.16, 0.81)};${RISES}}70%{${pose(1.3, 0.97, 1.04)};${FALLS}}80%{${pose(0, 1.07, 0.93)}}90%{${pose(0, 0.985, 1.02)}}100%{${pose(0, 1, 1)}}`;
  const crownHop = svg`0%{transform:rotate(0) scaleY(1)}12%{transform:rotate(3deg) scaleY(.86)}24%{transform:rotate(-7deg) scaleY(.88)}42%{transform:rotate(4deg) scaleY(1.16)}60%{transform:rotate(-3deg) scaleY(1.08)}66%{transform:rotate(6deg) scaleY(.76)}78%{transform:rotate(-5deg) scaleY(1.14)}88%{transform:rotate(3deg) scaleY(.95)}100%{transform:rotate(0) scaleY(1)}`;
  const shadeHop = svg`0%,58%,80%,100%{transform:scale(1);opacity:1}10%{transform:scale(1.1);opacity:1}37%{transform:scale(.62);opacity:.45}70%{transform:scale(.9);opacity:.8}`;
  const jelly = svg`0%{${pose(0, 1, 1)}}18%{${pose(0, 1.1, 0.9)}}40%{${pose(0, 0.95, 1.06)}}60%{${pose(0, 1.04, 0.96)}}80%{${pose(0, 0.99, 1.015)}}100%{${pose(0, 1, 1)}}`;
  const sip = svg`0%,18%{${pose(0, 1, 1)}}22%{${pose(0, 1.05, 0.94)}}27%{${pose(0, 1, 1.01)}}30%{${pose(0, 1.05, 0.94)}}34%{${pose(0, 1, 1.01)}}37%{${pose(0, 1.07, 0.92)}}48%{${pose(0, 0.93, 1.1, -4)}}58%{${pose(0, 0.95, 1.08, 4)}}68%{${pose(0, 0.96, 1.06, -3)}}78%{${pose(0, 1.05, 0.95)}}89%{${pose(0, 0.99, 1.02)}}100%{${pose(0, 1, 1)}}`;
  const crownSip = svg`0%,18%{transform:rotate(0) scaleY(1)}23%{transform:rotate(-4deg) scaleY(.88)}28%{transform:rotate(3deg) scaleY(1.04)}31%{transform:rotate(4deg) scaleY(.88)}35%{transform:rotate(-3deg) scaleY(1.04)}39%{transform:rotate(0) scaleY(.84)}52%{transform:rotate(7deg) scaleY(1.2)}62%{transform:rotate(-8deg) scaleY(1.16)}72%{transform:rotate(6deg) scaleY(1.12)}84%{transform:rotate(-2deg) scaleY(.94)}100%{transform:rotate(0) scaleY(1)}`;
  const heart = svg`0%{transform:translate(0,0) scale(.2);opacity:0}16%{transform:translate(0,-.4px) scale(1.3);opacity:1}28%{transform:translate(0,-.8px) scale(1)}62%{transform:translate(.9px,-3.6px) rotate(10deg) scale(1);opacity:1}100%{transform:translate(-.5px,-7px) rotate(-8deg) scale(.9);opacity:0}`;
  const drop = svg`0%{transform:translateY(0) scale(1,.8);opacity:0}12%{opacity:1}78%{transform:translateY(5px) scale(.9,1.35);opacity:1}100%{transform:translateY(5.9px) scale(2.4,.25);opacity:0}`;
  const pop = svg`0%{transform:scale(.45);opacity:0}45%{transform:scale(1.07);opacity:1}70%{transform:scale(.975)}100%{transform:scale(1)}`;
  const bump = svg`0%,14%{transform:translateY(0)}24%{transform:translateY(${n(-0.25 * lift)}px);${RISES}}41%{transform:translateY(${-lift}px);${FALLS}}60%{transform:translateY(2px)}73%{transform:translateY(${n(-0.2 * lift)}px)}86%{transform:translateY(1px)}100%{transform:translateY(0)}`;

  return svg`<style>
@keyframes breathe-${id}{0%{${pose(0, 1.03, 0.968)}}100%{${pose(0, 0.978, 1.034)}}}
@keyframes perk-${id}{0%,80%,100%{${pose(0, 1, 1)}}84%{${pose(0, 1.08, 0.9)};${RISES}}89%{${pose(1.5, 0.94, 1.08)};${FALLS}}93%{${pose(0, 1.07, 0.92)}}96.5%{${pose(0, 0.985, 1.025)}}}
@keyframes crownperk-${id}{0%,81%,100%{transform:rotate(0) scaleY(1)}85%{transform:rotate(-5deg) scaleY(.86)}90.5%{transform:rotate(4deg) scaleY(1.14)}94.5%{transform:rotate(-4deg) scaleY(.82)}97.5%{transform:rotate(2deg) scaleY(1.08)}}
@keyframes tilt-${id}{0%,34%,58%,100%{transform:rotate(0)}38%,54%{transform:rotate(-4deg)}}
@keyframes snooze-${id}{0%{${pose(0, 1.045, 0.95)}}45%,58%{${pose(0, 0.972, 1.04)}}100%{${pose(0, 1.045, 0.95)}}}
@keyframes droop-${id}{0%,100%{transform:rotate(12deg) scaleY(.94)}45%,58%{transform:rotate(8deg) scaleY(1)}}
@keyframes pant-${id}{0%{${pose(0, 1.035, 0.955)}}100%{${pose(0, 1.005, 0.985)}}}
@keyframes shiver-${id}{0%,34%,100%{transform:translateX(0)}4%,12%,20%,28%{transform:translateX(-.32px)}8%,16%,24%,31%{transform:translateX(.32px)}}
@keyframes crownshiver-${id}{0%,40%,100%{transform:rotate(0)}6%,14%,22%,30%{transform:rotate(4deg)}10%,18%,26%{transform:rotate(-4deg)}35%{transform:rotate(2deg)}}
@keyframes jump-${id}{0%,50%,100%{${pose(0, 1, 1)}}5%{${pose(0, 1.11, 0.85)};${RISES}}10%{${pose(1.4, 0.91, 1.13, -3)};${RISES}}20%{${pose(4.6, 1.02, 0.98, -6)};${FALLS}}29%{${pose(1.1, 0.93, 1.1, -3)}}32%{${pose(0, 1.14, 0.82)}}39%{${pose(0, 0.96, 1.05)}}45%{${pose(0, 1.02, 0.985)}}55%{${pose(0, 1.11, 0.85)};${RISES}}60%{${pose(1.4, 0.91, 1.13, 3)};${RISES}}70%{${pose(4.6, 1.02, 0.98, 6)};${FALLS}}79%{${pose(1.1, 0.93, 1.1, 3)}}82%{${pose(0, 1.14, 0.82)}}89%{${pose(0, 0.96, 1.05)}}95%{${pose(0, 1.02, 0.985)}}}
@keyframes crownjump-${id}{0%,50%,100%{transform:rotate(0) scaleY(1)}6%{transform:rotate(3deg) scaleY(.86)}13%{transform:rotate(8deg) scaleY(.9)}23%{transform:rotate(-5deg) scaleY(1.15)}33%{transform:rotate(3deg) scaleY(1.06)}36%{transform:rotate(-6deg) scaleY(.78)}42%{transform:rotate(4deg) scaleY(1.12)}47%{transform:rotate(-2deg) scaleY(.96)}56%{transform:rotate(-3deg) scaleY(.86)}63%{transform:rotate(-8deg) scaleY(.9)}73%{transform:rotate(5deg) scaleY(1.15)}83%{transform:rotate(-3deg) scaleY(1.06)}86%{transform:rotate(6deg) scaleY(.78)}92%{transform:rotate(-4deg) scaleY(1.12)}97%{transform:rotate(2deg) scaleY(.96)}}
@keyframes shadejump-${id}{0%,5%,32%,50%,55%,82%,100%{transform:scale(1);opacity:1}20%,70%{transform:scale(.66);opacity:.5}}
@keyframes bumpparty-${id}{0%,8%,36%,50%,58%,86%,100%{transform:translateY(0)}12%,62%{transform:translateY(${n(-0.2 * lift)}px);${RISES}}22%,72%{transform:translateY(${-lift}px);${FALLS}}33%,83%{transform:translateY(2px)}}
@keyframes sway-${id}{0%{transform:rotate(-4.5deg)}100%{transform:rotate(4.5deg)}}
@keyframes blink-${id}{0%,27%,31%,66%,70%,72.5%,76%,100%{transform:scaleY(1)}29%,68%,74%{transform:scaleY(.1)}}
@keyframes look-${id}{0%,22%,48%,74%,100%{transform:translate(0,0)}25%,44%{transform:translate(-.55px,0)}77%,90%{transform:translate(.55px,.25px)}}
@keyframes dart-${id}{0%,12%,64%,76%,100%{transform:translateX(0)}16%,36%{transform:translateX(-.6px)}40%,60%{transform:translateX(.6px)}}
@keyframes sweat-${id}{0%{transform:translateY(-.6px) scale(.3);opacity:0}16%{transform:translateY(0) scale(1);opacity:1}34%{transform:translateY(.2px) scale(1);opacity:1;${FALLS}}88%{transform:translateY(4px) scale(.9,1.2);opacity:1}100%{transform:translateY(4.8px) scale(1.4,.4);opacity:0}}
@keyframes tw-${id}{0%{opacity:.12}100%{opacity:1}}
@keyframes comet-${id}{0%,91%{transform:translate(0,0);opacity:0}92%{opacity:1}100%{transform:translate(${n(W * 0.55)}px,${n(W * 0.2)}px);opacity:0}}
@keyframes moon-${id}{0%{transform:translateY(0)}100%{transform:translateY(-1.4px)}}
@keyframes fly0-${id}{0%,100%{transform:translate(0,0)}22%{transform:translate(9px,-7px)}47%{transform:translate(-4px,-14px)}72%{transform:translate(-11px,-4px)}}
@keyframes fly1-${id}{0%,100%{transform:translate(0,0)}28%{transform:translate(-8px,-10px)}55%{transform:translate(6px,-16px)}80%{transform:translate(12px,-5px)}}
@keyframes fly2-${id}{0%,100%{transform:translate(0,0)}20%{transform:translate(5px,6px)}45%{transform:translate(14px,-6px)}70%{transform:translate(3px,-13px)}}
@keyframes flyglow-${id}{0%,100%{opacity:.1;transform:scale(.7)}35%,60%{opacity:1;transform:scale(1.2)}}
@keyframes glow-${id}{0%{opacity:.35}100%{opacity:.75}}
@keyframes float-${id}{0%{transform:translateY(0)}100%{transform:translateY(-2px)}}
@keyframes z-${id}{0%{opacity:0;transform:translate(0,8px) scale(.5)}18%{opacity:1}45%{transform:translate(5px,-2px) scale(.9) rotate(-8deg)}72%{opacity:.9;transform:translate(-1px,-11px) scale(1.05) rotate(6deg)}100%{opacity:0;transform:translate(6px,-20px) scale(1.2) rotate(-6deg)}}
@keyframes confetti-${id}{0%{transform:translateY(0)}100%{transform:translateY(${H + 12}px)}}
@keyframes tumble-${id}{0%{transform:translateX(-9px) rotate(-50deg) scaleX(1)}50%{transform:translateX(0) rotate(40deg) scaleX(.3)}100%{transform:translateX(9px) rotate(130deg) scaleX(1)}}
@keyframes cloud-${id}{0%{transform:translateX(0)}100%{transform:translateX(${W + CLOUD_LEAD}px)}}
@keyframes cloudbob-${id}{0%{transform:translateY(0)}100%{transform:translateY(3px)}}
@keyframes sunturn-${id}{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
@keyframes sunray-${id}{0%{transform:scale(.92);opacity:.6}100%{transform:scale(1.1);opacity:1}}
@keyframes blade-${id}{0%,100%{transform:skewX(0)}18%{transform:skewX(-22deg)}36%{transform:skewX(9deg)}52%{transform:skewX(-5deg)}68%{transform:skewX(0)}}
@keyframes birdhop-${id}{0%,58%,74%,100%{transform:translateY(0) scale(1,1)}61%{transform:translateY(0) scale(1.15,.8)}66%{transform:translateY(-1.1px) scale(.92,1.1)}71%{transform:translateY(0) scale(1.12,.85)}}
@keyframes birdturn-${id}{0%,24%,52%,100%{transform:scaleX(1)}28%,48%{transform:scaleX(-1)}}
@keyframes petal-${id}{0%{transform:translateY(0);opacity:0}10%{opacity:1}80%{opacity:.8}100%{transform:translateY(14px);opacity:0}}
@keyframes flutter-${id}{0%{transform:translateX(1.4px) rotate(-30deg)}100%{transform:translateX(-3px) rotate(50deg)}}
@keyframes aura-${id}{0%{opacity:.5;transform:scale(.96)}100%{opacity:1;transform:scale(1.04)}}
@keyframes spark-${id}{0%,55%,100%{opacity:0;transform:scale(.2) rotate(0)}18%{opacity:1;transform:scale(1.15) rotate(45deg)}32%{opacity:1;transform:scale(.9) rotate(90deg)}}
${twice("hop", id, hop)}${twice("crownhop", id, crownHop)}${twice("shadehop", id, shadeHop)}${twice("jelly", id, jelly)}${twice("sip", id, sip)}${twice("crownsip", id, crownSip)}${twice("heart", id, heart)}${twice("drop", id, drop)}${twice("pop", id, pop)}${twice("bump", id, bump)}
.breathe-happy-${id},.breathe-party-${id}{animation:breathe-${id} 1.7s ease-in-out infinite alternate}
.breathe-sleep-${id}{animation:snooze-${id} 4.6s ease-in-out infinite}
.breathe-worry-${id}{animation:pant-${id} .55s ease-in-out infinite alternate}
.move-happy-${id}{animation:perk-${id} 9.2s ease-in-out infinite}
.crown-happy-${id}{animation:crownperk-${id} 9.2s ease-in-out infinite}
.tilt-happy-${id}{animation:tilt-${id} 13s ease-in-out infinite}
.move-worry-${id}{animation:shiver-${id} 2.3s linear infinite}
.crown-worry-${id}{animation:crownshiver-${id} 2.3s ease-in-out infinite}
.move-party-${id}{animation:jump-${id} 2.8s ease-in-out infinite}
.crown-party-${id}{animation:crownjump-${id} 2.8s ease-in-out infinite}
.shade-party-${id}{animation:shadejump-${id} 2.8s ease-in-out infinite}
.bumpparty-${id}{animation:bumpparty-${id} 2.8s ease-in-out infinite}
.crown-sleep-${id}{animation:droop-${id} 4.6s ease-in-out infinite}
.sway-happy-${id},.sway-party-${id}{animation:sway-${id} 1.45s ease-in-out infinite alternate}
.sway-worry-${id}{animation:sway-${id} .9s ease-in-out infinite alternate}
.blink-${id}{animation:blink-${id} 6.1s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.look-${id}{animation:look-${id} 11s ease-in-out infinite}
.dart-${id}{animation:dart-${id} 3.1s cubic-bezier(.3,0,.1,1) infinite}
.sweat-${id}{animation:sweat-${id} 2.1s ease-out infinite;transform-box:fill-box;transform-origin:center top}
.star-${id}{animation:tw-${id} 2.4s ease-in-out infinite alternate}
.comet-${id}{opacity:0;animation:comet-${id} 17s ease-in infinite}
.moon-${id}{animation:moon-${id} 5.5s ease-in-out infinite alternate}
.fly0-${id}{animation:fly0-${id} 8s ease-in-out infinite}
.fly1-${id}{animation:fly1-${id} 8s ease-in-out infinite}
.fly2-${id}{animation:fly2-${id} 8s ease-in-out infinite}
.flyglow-${id}{animation:flyglow-${id} 2.3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.glow-${id}{animation:glow-${id} 2.3s ease-in-out infinite alternate}
.float-${id}{animation:float-${id} 2.9s ease-in-out infinite alternate}
.z-${id}{opacity:0;animation:z-${id} 4.6s ease-out infinite;transform-box:fill-box;transform-origin:center}
.confetti-${id}{animation:confetti-${id} 3s linear infinite}
.tumble-${id}{animation:tumble-${id} 1s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}
.cloud-${id}{animation:cloud-${id} 100s linear infinite}
.cloudbob-${id}{animation:cloudbob-${id} 6.3s ease-in-out infinite alternate}
.sunturn-${id}{animation:sunturn-${id} 48s linear infinite}
.sunray-${id}{animation:sunray-${id} 1.9s ease-in-out infinite alternate}
.blade-${id}{animation:blade-${id} ${BREEZE_S}s ease-in-out infinite;transform-box:fill-box;transform-origin:center bottom}
.bird-${id}{animation:birdhop-${id} 3.7s ease-in-out infinite;transform-box:fill-box;transform-origin:center bottom}
.birdturn-${id}{animation:birdturn-${id} 7.9s cubic-bezier(.7,0,.3,1) infinite;transform-box:fill-box;transform-origin:center}
.petal-${id}{opacity:0;animation:petal-${id} 3s ease-in infinite}
.flutter-${id}{animation:flutter-${id} 1.6s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}
.aura-${id}{animation:aura-${id} 2.6s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}
.spark-${id}{opacity:0;animation:spark-${id} 2.9s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
${bothTakes("hop", id, "1s ease-in-out both")}${bothTakes("crownhop", id, "1.05s ease-in-out both")}${bothTakes("shadehop", id, "1s ease-in-out both")}${bothTakes("jelly", id, ".9s ease-in-out both")}${bothTakes("sip", id, "1.7s ease-in-out both")}${bothTakes("crownsip", id, "1.75s ease-in-out both")}${bothTakes("pop", id, ".42s cubic-bezier(.2,.7,.3,1) both")}${bothTakes("bump", id, "1.05s ease-in-out both")}
.hearta-${id},.heartb-${id}{opacity:0;animation:hearta-${id} 1.1s ease-out both;transform-box:fill-box;transform-origin:center}.heartb-${id}{animation-name:heartb-${id}}
.dropa-${id},.dropb-${id}{opacity:0;animation:dropa-${id} .5s ${FALL} both;transform-box:fill-box;transform-origin:center bottom}.dropb-${id}{animation-name:dropb-${id}}
@media (prefers-reduced-motion: reduce){.scene-${id} *{animation:none!important}.hearta-${id},.heartb-${id},.dropa-${id},.dropb-${id},.z-${id},.petal-${id},.comet-${id}{opacity:0}.spark-${id}{opacity:1}}
</style>`;
}
