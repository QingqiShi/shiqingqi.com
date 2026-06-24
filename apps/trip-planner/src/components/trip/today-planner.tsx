"use client";

import {
  ChevronDown,
  Clock3,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useId, useState } from "react";
import { type DayMoment, formatDuration, momentLabel } from "@/lib/schedule";
import { cn } from "@/lib/utils";

/** An on/off switch for keeping or dropping one stop. `checked` = kept. */
function KeepSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${checked ? "保留" : "已关闭"}：${label}`}
      onClick={onChange}
      className={cn(
        "relative h-6 w-10 shrink-0 rounded-full border transition-colors",
        checked ? "border-foreground bg-foreground" : "border-input bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-[1.125rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/**
 * The "keep today honest" control: a single button that sits by the current
 * moment in the feed. Open it to switch off optional stops still ahead — booked
 * tables, travel and check-in/out are never listed, so the must-dos are safe —
 * and the feed re-times and re-routes around what's left. Choices persist
 * on-device via {@link useTodayPlan}.
 */
export function TodayPlanner({
  optional,
  dropped,
  onToggle,
  onRestoreAll,
}: {
  optional: DayMoment[];
  dropped: Set<string>;
  onToggle: (time: string) => void;
  onRestoreAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const droppedHere = optional.filter((moment) => dropped.has(moment.time));
  const savedMinutes = droppedHere.reduce(
    (sum, moment) => sum + moment.durationMin,
    0,
  );
  const droppedCount = droppedHere.length;

  const summary =
    droppedCount > 0
      ? `已关 ${String(droppedCount)} 项 · 省下约 ${formatDuration(savedMinutes)}`
      : "落后于计划？关掉来不及的可选项";

  return (
    <div className="rounded-xl border border-dashed bg-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">调整后续行程</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {summary}
          </span>
        </span>
        {droppedCount > 0 ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background tabular-nums">
            <Clock3 className="size-3" />−{formatDuration(savedMinutes)}
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div id={panelId} className="border-t px-4 py-3">
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            保留所有必到项（行程、入住退房、已订餐厅），只在下面关掉来不及的可选活动；关掉后行程与导航会自动更新。
          </p>
          <ul className="space-y-1">
            {optional.map((moment) => {
              const isKept = !dropped.has(moment.time);
              const label = momentLabel(moment);
              return (
                <li
                  key={moment.time}
                  className="flex items-center gap-3 py-1.5"
                >
                  <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                    {moment.time}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-sm leading-snug text-pretty",
                        !isKept && "text-muted-foreground line-through",
                      )}
                    >
                      {label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                      约 {formatDuration(moment.durationMin)}
                    </span>
                  </span>
                  <KeepSwitch
                    checked={isKept}
                    label={label}
                    onChange={() => {
                      onToggle(moment.time);
                    }}
                  />
                </li>
              );
            })}
          </ul>

          {droppedCount > 0 ? (
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <span className="text-xs text-muted-foreground">
                已关 {droppedCount} 项 · 预计省下约{" "}
                {formatDuration(savedMinutes)}
              </span>
              <button
                type="button"
                onClick={onRestoreAll}
                className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <RotateCcw className="size-3" />
                全部恢复
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
