"use client";

import { byTime, formatKey, monthGrid, sameMonth, type DayKey } from "@/lib/calendar";
import type { CourseworkItem } from "@/lib/types";
import { useTracker } from "../TrackerContext";
import { EventChip } from "./Event";

const MAX_CHIPS = 3;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  cursor: DayKey;
  selected: DayKey;
  itemsByDay: Map<DayKey, CourseworkItem[]>;
  onSelect: (k: DayKey) => void;
  onOpenDay: (k: DayKey) => void;
}

export function MonthView({ cursor, selected, itemsByDay, onSelect, onOpenDay }: Props) {
  const { todayKey } = useTracker();
  const days = monthGrid(cursor);

  return (
    <div className="month" role="grid" aria-label={formatKey(cursor, { month: "long", year: "numeric" })}>
      <div className="month-head" role="row">
        {WEEKDAYS.map((d) => (
          <div key={d} role="columnheader" className="month-weekday">
            {d}
          </div>
        ))}
      </div>
      <div className="month-body" style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(112px, 1fr))` }}>
        {days.map((k) => {
          const items = [...(itemsByDay.get(k) ?? [])].sort(byTime);
          const extra = items.length - MAX_CHIPS;
          const classes = ["month-cell"];
          if (!sameMonth(k, cursor)) classes.push("is-outside");
          if (k === todayKey) classes.push("is-today");
          if (k === selected) classes.push("is-selected");
          return (
            <div
              key={k}
              role="gridcell"
              aria-selected={k === selected}
              className={classes.join(" ")}
              onClick={() => onSelect(k)}
              onDoubleClick={() => onOpenDay(k)}
            >
              <button
                type="button"
                className="month-date"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDay(k);
                }}
                aria-label={`Open ${formatKey(k, { weekday: "long", month: "long", day: "numeric" })}`}
              >
                {Number(k.slice(8))}
              </button>
              <div className="month-events">
                {items.slice(0, extra > 0 ? MAX_CHIPS - 1 : MAX_CHIPS).map((i) => (
                  <EventChip key={i.id} item={i} />
                ))}
                {extra > 0 && (
                  <button
                    type="button"
                    className="month-more"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDay(k);
                    }}
                  >
                    +{extra + 1} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
