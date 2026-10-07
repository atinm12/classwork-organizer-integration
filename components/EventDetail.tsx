"use client";

import { calendarDaysBetween } from "@/lib/dates";
import type { CourseworkItem } from "@/lib/types";
import { Dialog } from "./Dialog";
import { CheckIcon, ExternalIcon } from "./icons";
import { useTracker } from "./TrackerContext";

const COMPLETE_STATUSES = new Set(["submitted", "graded", "excused"]);

function relative(iso: string, now: Date, timeZone: string): string {
  const days = calendarDaysBetween(now, new Date(iso), timeZone);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export function EventDetail({
  item,
  manuallyDone,
  onClose,
  onDelete,
}: {
  item: CourseworkItem;
  manuallyDone: boolean;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const { timeZone, now, colorOf, isComplete, isOverdue, toggleDone } = useTracker();
  const color = colorOf(item.course);
  const done = isComplete(item);
  const doneBySource = COMPLETE_STATUSES.has(item.status ?? "");

  const due = item.dueDate
    ? new Intl.DateTimeFormat("en-US", {
        timeZone,
        weekday: "long",
        month: "long",
        day: "numeric",
        ...(item.dateOnly ? {} : { hour: "numeric", minute: "2-digit" }),
      }).format(new Date(item.dueDate))
    : "Date TBA";

  return (
    <Dialog
      onClose={onClose}
      className="detail"
      title={
        <div className="detail-title">
          <span className="detail-rule" style={{ background: color.accent }} />
          <div>
            <h2 className={done ? "is-done-text" : ""}>{item.title}</h2>
            <p className="muted">
              {item.course} · {item.type === "test" ? "Test" : "Assignment"}
            </p>
          </div>
        </div>
      }
    >
      <dl className="detail-grid">
        <dt>Due</dt>
        <dd>
          {due}
          {item.dueDate && <span className="muted"> ({relative(item.dueDate, now, timeZone)})</span>}
          {isOverdue(item) && <span className="overdue-tag">Overdue</span>}
        </dd>
        {item.points != null && (
          <>
            <dt>Points</dt>
            <dd>{item.points}</dd>
          </>
        )}
        {item.status && (
          <>
            <dt>Status</dt>
            <dd className={`status status-${item.status}`}>{item.status}</dd>
          </>
        )}
        <dt>Source</dt>
        <dd>{item.source}</dd>
        {item.description && (
          <>
            <dt>Notes</dt>
            <dd className="detail-notes">{item.description}</dd>
          </>
        )}
      </dl>

      <div className="detail-actions">
        <button
          type="button"
          className={done ? "btn btn-ghost" : "btn btn-primary"}
          onClick={() => toggleDone(item)}
          disabled={doneBySource && !manuallyDone}
          title={doneBySource ? `Marked ${item.status} by ${item.source}` : undefined}
        >
          <CheckIcon width={15} height={15} />
          {done ? (doneBySource && !manuallyDone ? `Completed on ${item.source}` : "Completed — undo") : "Mark complete"}
        </button>
        {item.url && (
          <a className="btn btn-ghost" href={item.url} target="_blank" rel="noopener noreferrer">
            Open in {item.source === "Canvas" ? "Canvas" : "source"} <ExternalIcon width={14} height={14} />
          </a>
        )}
        {onDelete && (
          <button type="button" className="btn btn-danger-text" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </Dialog>
  );
}
