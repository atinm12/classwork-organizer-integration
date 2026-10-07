"use client";

import type { CSSProperties } from "react";
import { formatShortTime, formatTime } from "@/lib/calendar";
import type { CourseworkItem } from "@/lib/types";
import { CheckIcon } from "../icons";
import { useTracker } from "../TrackerContext";

function useEventStyle(item: CourseworkItem) {
  const { colorOf, isComplete, isOverdue } = useTracker();
  const c = colorOf(item.course);
  const style = { "--ev-bg": c.bg, "--ev-accent": c.accent, "--ev-ink": c.ink } as CSSProperties;
  const classes = [];
  if (isComplete(item)) classes.push("is-done");
  if (isOverdue(item)) classes.push("is-overdue");
  if (item.type === "test") classes.push("is-test");
  return { style, classes: classes.join(" "), done: isComplete(item), overdue: isOverdue(item) };
}

function label(item: CourseworkItem, time: string, done: boolean, overdue: boolean): string {
  return [item.title, item.course, item.type === "test" ? "test" : null, time, done ? "completed" : null, overdue ? "overdue" : null]
    .filter(Boolean)
    .join(", ");
}

/** Compact one-line event used inside month cells and the all-day row. */
export function EventChip({ item }: { item: CourseworkItem }) {
  const { timeZone, openItem } = useTracker();
  const { style, classes, done, overdue } = useEventStyle(item);
  const time = formatShortTime(item, timeZone);
  return (
    <button
      type="button"
      className={`ev-chip ${classes}`}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        openItem(item);
      }}
      title={`${item.title} — ${item.course}`}
      aria-label={label(item, formatTime(item, timeZone), done, overdue)}
    >
      {done && <CheckIcon className="ev-check" width={11} height={11} />}
      <span className="ev-title">{item.title}</span>
      {time && <span className="ev-time">{time}</span>}
    </button>
  );
}

/** Positioned event in the week/day time grid. */
export function EventBlock({
  item,
  top,
  height,
  lane,
  lanes,
}: {
  item: CourseworkItem;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}) {
  const { timeZone, openItem } = useTracker();
  const { style, classes, done, overdue } = useEventStyle(item);
  const time = formatTime(item, timeZone);
  const width = 100 / lanes;
  return (
    <button
      type="button"
      className={`ev-block ${classes}`}
      style={{ ...style, top, height, left: `calc(${lane * width}% + 2px)`, width: `calc(${width}% - 4px)` }}
      onClick={(e) => {
        e.stopPropagation();
        openItem(item);
      }}
      aria-label={label(item, time, done, overdue)}
    >
      <span className="ev-title">
        {done && <CheckIcon className="ev-check" width={11} height={11} />}
        {item.title}
      </span>
      <span className="ev-meta">
        {item.type === "test" && <span className="ev-tag">Test</span>}
        {time} · {item.course}
      </span>
    </button>
  );
}
