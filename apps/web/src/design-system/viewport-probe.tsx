"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const UNITS = ["dvh", "svh", "lvh"] as const;
const SIDES = ["top", "bottom", "left"] as const;
const RULER_TICKS = Array.from({ length: 31 }, (_, index) => index * 10);

function subscribeToNothing() {
  return () => {};
}

function px(value: number) {
  return String(Math.round(value * 10) / 10);
}

function read(probe: HTMLElement) {
  const lines: string[] = [];
  for (const side of SIDES) {
    const el = probe.querySelector<HTMLElement>(`[data-inset="${side}"]`);
    if (el) lines.push(`inset-${side} ${getComputedStyle(el).paddingTop}`);
  }
  for (const unit of UNITS) {
    const el = probe.querySelector<HTMLElement>(`[data-unit="${unit}"]`);
    if (el) lines.push(`100${unit} ${px(el.getBoundingClientRect().height)}`);
  }
  const visual = window.visualViewport;
  lines.push(
    `innerHeight ${px(window.innerHeight)}`,
    `clientHeight ${px(document.documentElement.clientHeight)}`,
    `visual h ${px(visual?.height ?? -1)} offsetTop ${px(visual?.offsetTop ?? -1)} pageTop ${px(visual?.pageTop ?? -1)}`,
    `scrollY ${px(window.scrollY)}`,
    `screen ${px(screen.width)}x${px(screen.height)}`,
  );
  const sidebar = document.querySelector<HTMLElement>(
    "[data-split-view-sidebar]",
  );
  if (sidebar) {
    const rect = sidebar.getBoundingClientRect();
    lines.push(
      `sidebar ${getComputedStyle(sidebar).position} top ${px(rect.top)} h ${px(rect.height)}`,
    );
    let el = sidebar.querySelector<HTMLElement>("a");
    let depth = 0;
    while (el && el !== sidebar) {
      const style = getComputedStyle(el);
      lines.push(
        `  ^${px(depth)} ${el.tagName.toLowerCase()} top ${px(el.getBoundingClientRect().top)} pt ${style.paddingTop} ${style.position}`,
      );
      el = el.parentElement;
      depth += 1;
    }
  }
  return lines.join("\n");
}

/**
 * Temporary readout of the viewport and the sidebar, for a fault that shows
 * only in Safari on an iPad. It shows with `?probe` in the address.
 */
export function ViewportProbe() {
  const ref = useRef<HTMLDivElement>(null);
  const isOn = useSyncExternalStore(
    subscribeToNothing,
    () => new URLSearchParams(location.search).has("probe"),
    () => false,
  );
  const [text, setText] = useState("");

  useEffect(() => {
    if (!isOn) return;
    const update = () => {
      if (ref.current) setText(read(ref.current));
    };
    update();
    const timer = setInterval(update, 250);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [isOn]);

  if (!isOn) return null;

  // Each fixed box has no size of its own, so that Safari does not take a
  // colour for its bars from it.
  return (
    <div ref={ref} aria-hidden>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          zIndex: 99999,
          pointerEvents: "none",
        }}
      >
        {RULER_TICKS.map((y) => (
          <div
            key={y}
            style={{
              position: "absolute",
              top: y,
              left: 0,
              width: y % 50 === 0 ? 40 : 12,
              borderTop: "1px solid red",
              font: "9px/1 monospace",
              color: "red",
              paddingLeft: 14,
            }}
          >
            {y % 50 === 0 ? y : ""}
          </div>
        ))}
      </div>
      <div
        style={{
          position: "fixed",
          top: "50%",
          right: 0,
          width: 0,
          height: 0,
          zIndex: 99999,
          pointerEvents: "none",
        }}
      >
        <pre
          style={{
            position: "absolute",
            top: 0,
            right: 8,
            margin: 0,
            padding: 8,
            font: "11px/1.35 monospace",
            color: "#fff",
            background: "rgba(0,0,0,0.85)",
            borderRadius: 8,
            whiteSpace: "pre",
          }}
        >
          {text}
        </pre>
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          overflow: "hidden",
          visibility: "hidden",
        }}
      >
        {SIDES.map((side) => (
          <div
            key={side}
            data-inset={side}
            style={{ paddingTop: `env(safe-area-inset-${side})` }}
          />
        ))}
        {UNITS.map((unit) => (
          <div key={unit} data-unit={unit} style={{ height: `100${unit}` }} />
        ))}
      </div>
    </div>
  );
}
