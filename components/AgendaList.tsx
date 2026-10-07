"use client";

import { useState, type ReactNode } from "react";
import { calendarDaysBetween } from "@/lib/dates";
import type { CourseworkItem, ItemType } from "@/lib/types";
import { CheckIcon } from "./icons";
import { useTracker } from "./TrackerContext";

export type Sort = "due-asc" | "due-desc" | "course" | "points";
export type TimeWindow = "recent" | "upcoming" | "all";

const RECENT_DAYS = 10;
const dueMs = (i: CourseworkItem) => new Date(i.dueDate!).getTime();

const SORTERS: Record<Sort, (a: CourseworkItem, b: CourseworkItem) => number> = {
  "due-asc": (a, b) => dueMs(a) - dueMs(b),
  "due-desc": (a, b) => dueMs(b) - dueMs(a),
  course: (a, b) => a.course.localeCompare(b.course) || dueMs(a) - dueMs(b),
  points: (a, b) => (b.points ?? -1) - (a.points ?? -1) || dueMs(a) - dueMs(b),
};

function AgendaRow({ item }: { item: CourseworkItem }) {
  const { timeZone, now, colorOf, isComplete, isOverdue, openItem, toggleDone } = useTracker();
  const done = isComplete(item);
  const overdue = isOverdue(item);
  const classes = ["agenda-row"];
  if (done) classes.push("is-done");
  if (overdue) classes.push("is-overdue");

  let due = "Date TBA";
  let rel = "";
  if (item.dueDate) {
    due = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      ...(item.dateOnly ? {} : { hour: "numeric", minute: "2-digit" }),
    }).format(new Date(item.dueDate));
    const days = calendarDaysBetween(now, new Date(item.dueDate), timeZone);
    rel = days === 0 ? "today" : days === 1 ? "tomorrow" : days === -1 ? "yesterday" : days > 0 ? `in ${days}d` : `${-days}d ago`;
  }

  return (
    <li className={classes.join(" ")}>
      <button
        type="button"
        className={done ? "check is-checked" : "check"}
        onClick={() => toggleDone(item)}
        aria-label={done ? "Mark not complete" : "Mark complete"}
        aria-pressed={done}
      >
        {done && <CheckIcon width={12} height={12} />}
      </button>
      <span className="agenda-rule" style={{ background: colorOf(item.course).accent }} />
      <button type="button" className="agenda-main" onClick={() => openItem(item)}>
        <span className="agenda-title">
          {item.title}
          {overdue && <span className="overdue-tag">Overdue</span>}
        </span>
        <span className="agenda-course">{item.course}</span>
      </button>
      <span className="agenda-due">
        {due} {rel && <span className="muted">· {rel}</span>}
      </span>
      <span className="agenda-points">{item.points != null ? `${item.points} pts` : ""}</span>
      <span className={`agenda-status status status-${item.status ?? "none"}`}>{item.status ?? ""}</span>
      <span className="agenda-source">{item.source}</span>
    </li>
  );
}

/** Table-style list for the Assignments and Tests sections, with sort and time-window controls. */
export function AgendaList({ type, items }: { type: ItemType; items: CourseworkItem[] }) {
  const { timeZone, now } = useTracker();
  const [sort, setSort] = useState<Sort>("due-asc");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("recent");

  const ofType = items.filter((i) => i.type === type);
  const cutoff = timeWindow === "upcoming" ? now.getTime() : now.getTime() - RECENT_DAYS * 86_400_000;
  const dated = ofType.filter((i) => i.dueDate && (timeWindow === "all" || dueMs(i) >= cutoff)).sort(SORTERS[sort]);
  const tba = ofType.filter((i) => !i.dueDate);

  // In date-sorted views, a divider marks today between past-due and upcoming items.
  const rows: ReactNode[] = [];
  const dateSorted = sort === "due-asc" || sort === "due-desc";
  let placed = !dateSorted;
  const divider = (
    <li key="today" className="agenda-today">
      Today · {new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(now)}
    </li>
  );
  for (const i of dated) {
    const future = dueMs(i) >= now.getTime();
    if (!placed && (sort === "due-asc" ? future : !future)) {
      rows.push(divider);
      placed = true;
    }
    rows.push(<AgendaRow key={i.id} item={i} />);
  }
  if (!placed) rows.push(divider);

  const noun = type === "assignment" ? "assignments" : "tests";

  return (
    <div className="agenda">
      <div className="agenda-controls">
        <label>
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="due-asc">Due date (earliest first)</option>
            <option value="due-desc">Due date (latest first)</option>
            <option value="course">Course</option>
            <option value="points">Points (most first)</option>
          </select>
        </label>
        <label>
          <span>Show</span>
          <select value={timeWindow} onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}>
            <option value="recent">Last {RECENT_DAYS} days &amp; upcoming</option>
            <option value="upcoming">Upcoming only</option>
            <option value="all">All dates</option>
          </select>
        </label>
      </div>

      <ul className="agenda-list">
        {dated.length === 0 ? <li className="agenda-empty">No {noun} in this time window.</li> : rows}
      </ul>

      {tba.length > 0 && (
        <>
          <h3 className="agenda-subhead">Date TBA</h3>
          <ul className="agenda-list">
            {tba.map((i) => (
              <AgendaRow key={i.id} item={i} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
