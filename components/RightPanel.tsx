"use client";

import { addDays, byTime, formatKey, formatTime, weekDays, type DayKey } from "@/lib/calendar";
import type { CourseworkItem } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "./icons";
import { useTracker } from "./TrackerContext";

const UPCOMING_LIMIT = 5;

function Row({ item, showDate }: { item: CourseworkItem; showDate?: boolean }) {
  const { timeZone, colorOf, openItem, isComplete, isOverdue } = useTracker();
  const classes = ["panel-row"];
  if (isComplete(item)) classes.push("is-done");
  return (
    <button type="button" className={classes.join(" ")} onClick={() => openItem(item)}>
      {showDate && item.dueDate && (
        <span className="panel-row-date">
          {new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(new Date(item.dueDate))}
        </span>
      )}
      <span className="dot" style={{ background: colorOf(item.course).accent }} />
      <span className="panel-row-main">
        <span className="panel-row-title">{item.title}</span>
        <span className="panel-row-meta">
          {formatTime(item, timeZone)}
          {item.type === "test" && " · Test"}
          {isOverdue(item) && <span className="overdue-text"> · Overdue</span>}
        </span>
      </span>
      <span className="panel-row-source">{item.source}</span>
    </button>
  );
}

function Progress({ label, done, total }: { label: string; done: number; total: number }) {
  return (
    <div className="progress">
      <div className="progress-label">
        <span>{label}</span>
        <span className="muted">
          {done} / {total}
        </span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: total ? `${(done / total) * 100}%` : 0 }} />
      </div>
    </div>
  );
}

interface Props {
  selected: DayKey;
  onSelect: (k: DayKey) => void;
  itemsByDay: Map<DayKey, CourseworkItem[]>;
  visibleItems: CourseworkItem[];
  tbaItems: CourseworkItem[];
  onViewAll: () => void;
}

export function RightPanel({ selected, onSelect, itemsByDay, visibleItems, tbaItems, onViewAll }: Props) {
  const { now, isComplete } = useTracker();
  const dayItems = [...(itemsByDay.get(selected) ?? [])].sort(byTime);

  const upcoming = visibleItems
    .filter((i) => i.dueDate && new Date(i.dueDate).getTime() >= now.getTime() && !isComplete(i))
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, UPCOMING_LIMIT);

  const week = weekDays(selected).flatMap((k) => itemsByDay.get(k) ?? []);
  const tally = (type: "assignment" | "test") => {
    const list = week.filter((i) => i.type === type);
    return { done: list.filter(isComplete).length, total: list.length };
  };
  const courses = new Map<string, boolean>();
  for (const i of week) courses.set(i.course, (courses.get(i.course) ?? true) && isComplete(i));
  const coursesDone = [...courses.values()].filter(Boolean).length;

  return (
    <aside className="rpanel" aria-label="Selected date details">
      <section className="rpanel-section">
        <div className="rpanel-date">
          <h2>{formatKey(selected, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</h2>
          <div className="icon-pair">
            <button type="button" className="icon-btn" onClick={() => onSelect(addDays(selected, -1))} aria-label="Previous day">
              <ChevronLeft />
            </button>
            <button type="button" className="icon-btn" onClick={() => onSelect(addDays(selected, 1))} aria-label="Next day">
              <ChevronRight />
            </button>
          </div>
        </div>
        {dayItems.length === 0 ? (
          <p className="muted small">Nothing due this day.</p>
        ) : (
          dayItems.map((i) => <Row key={i.id} item={i} />)
        )}
      </section>

      <section className="rpanel-section">
        <div className="rpanel-heading">
          <h3>Upcoming</h3>
          <button type="button" className="text-btn" onClick={onViewAll}>
            View all
          </button>
        </div>
        {upcoming.length === 0 ? (
          <p className="muted small">You&apos;re all caught up.</p>
        ) : (
          upcoming.map((i) => <Row key={i.id} item={i} showDate />)
        )}
      </section>

      {tbaItems.length > 0 && (
        <section className="rpanel-section">
          <div className="rpanel-heading">
            <h3>Date TBA</h3>
          </div>
          {tbaItems.map((i) => (
            <Row key={i.id} item={i} />
          ))}
        </section>
      )}

      <section className="rpanel-section">
        <div className="rpanel-heading">
          <h3>This week</h3>
        </div>
        <Progress label="Assignments" {...tally("assignment")} />
        <Progress label="Tests" {...tally("test")} />
        <Progress label="Classes wrapped up" done={coursesDone} total={courses.size} />
      </section>
    </aside>
  );
}
