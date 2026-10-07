"use client";

import { calendarDaysBetween } from "@/lib/dates";
import type { CourseworkItem } from "@/lib/types";

function formatDue(item: CourseworkItem, timeZone: string): string {
  const date = new Date(item.dueDate!);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(item.dateOnly ? {} : { hour: "numeric", minute: "2-digit" }),
  }).format(date);
}

function relativeDay(iso: string, now: Date, timeZone: string): string {
  const days = calendarDaysBetween(now, new Date(iso), timeZone);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

function sourceClass(item: CourseworkItem): string {
  if (item.source === "Canvas") return "badge badge-canvas";
  if (item.id.startsWith("custom-")) return "badge badge-personal";
  return "badge badge-page";
}

interface Props {
  item: CourseworkItem;
  timeZone: string;
  now: Date;
  done: boolean;
  overdue: boolean;
  onToggleDone: () => void;
  onDelete?: () => void;
}

export function ItemCard({ item, timeZone, now, done, overdue, onToggleDone, onDelete }: Props) {
  const classes = ["item"];
  if (overdue) classes.push("item-overdue");
  if (done) classes.push("item-done");

  return (
    <li className={classes.join(" ")}>
      <label className="done-toggle" title={done ? "Mark not done" : "Mark done"}>
        <input type="checkbox" checked={done} onChange={onToggleDone} />
        <span className="sr-only">Mark done</span>
      </label>

      <div className="item-body">
        <div className="item-title-row">
          <span className="item-title">{item.title}</span>
          {overdue && <span className="badge badge-overdue">Overdue</span>}
        </div>
        <div className="item-meta">
          <span className="item-course">{item.course}</span>
          {item.dueDate && (
            <span>
              Due {formatDue(item, timeZone)}{" "}
              <span className="muted">({relativeDay(item.dueDate, now, timeZone)})</span>
            </span>
          )}
          {item.points != null && <span>{item.points} pts</span>}
          {item.status && <span className={`status status-${item.status}`}>{item.status}</span>}
        </div>
      </div>

      <div className="item-actions">
        <span className={sourceClass(item)}>{item.source}</span>
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            Open ↗
          </a>
        )}
        {onDelete && (
          <button type="button" className="link-button" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </li>
  );
}
