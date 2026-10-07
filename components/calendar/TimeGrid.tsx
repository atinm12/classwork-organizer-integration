"use client";

import { useEffect, useRef } from "react";
import { byTime, formatHour, formatKey, itemMinutes, type DayKey } from "@/lib/calendar";
import { zonedParts } from "@/lib/dates";
import type { CourseworkItem } from "@/lib/types";
import { useTracker } from "../TrackerContext";
import { EventBlock, EventChip } from "./Event";

const HOUR_PX = 56;
const BLOCK_PX = 52;
const DAY_PX = HOUR_PX * 24;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

interface Placed {
  item: CourseworkItem;
  top: number;
  lane: number;
  lanes: number;
}

/** Places due-time blocks and splits overlapping ones into side-by-side lanes. */
function layoutDay(items: CourseworkItem[], timeZone: string): Placed[] {
  const out: Placed[] = [];
  let cluster: Placed[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    cluster.forEach((p) => (p.lanes = laneEnds.length));
    cluster = [];
    laneEnds = [];
  };
  for (const item of [...items].sort(byTime)) {
    // Blocks start at the due time; late-night ones are nudged up so they stay on the grid.
    const top = Math.min((itemMinutes(item, timeZone) / 60) * HOUR_PX, DAY_PX - BLOCK_PX);
    if (top >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= top);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = top + BLOCK_PX;
    clusterEnd = Math.max(clusterEnd, top + BLOCK_PX);
    const placed = { item, top, lane, lanes: 1 };
    cluster.push(placed);
    out.push(placed);
  }
  flush();
  return out;
}

interface Props {
  days: DayKey[];
  selected: DayKey;
  itemsByDay: Map<DayKey, CourseworkItem[]>;
  onSelect: (k: DayKey) => void;
  onOpenDay: (k: DayKey) => void;
  /** Shown under the date header in day view. */
  summary?: React.ReactNode;
}

export function TimeGrid({ days, selected, itemsByDay, onSelect, onOpenDay, summary }: Props) {
  const { timeZone, now, todayKey } = useTracker();
  const scrollRef = useRef<HTMLDivElement>(null);
  const single = days.length === 1;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7.5 * HOUR_PX;
  }, [single]);

  const allDay = days.map((k) => (itemsByDay.get(k) ?? []).filter((i) => i.dateOnly));
  const hasAllDay = allDay.some((list) => list.length > 0);
  const nowParts = zonedParts(now, timeZone);
  const nowTop = ((nowParts.hour * 60 + nowParts.minute) / 60) * HOUR_PX;
  const cols = { gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` };

  return (
    <div className={single ? "tg tg-day" : "tg"} ref={scrollRef}>
      <div className="tg-sticky">
        <div className="tg-head" style={cols}>
          <div className="tg-gutter" />
          {days.map((k) => {
            const classes = ["tg-dayhead"];
            if (k === todayKey) classes.push("is-today");
            if (k === selected && !single) classes.push("is-selected");
            return single ? (
              <div key={k} className={classes.join(" ")}>
                <div className="tg-bigdate">
                  <span className="tg-bigdate-num">{Number(k.slice(8))}</span>
                  <span>
                    <span className="tg-bigdate-weekday">{formatKey(k, { weekday: "long" })}</span>
                    <span className="tg-bigdate-month">{formatKey(k, { month: "long", year: "numeric" })}</span>
                  </span>
                </div>
                {summary}
              </div>
            ) : (
              <button key={k} type="button" className={classes.join(" ")} onClick={() => onOpenDay(k)}>
                <span className="tg-weekday">{formatKey(k, { weekday: "short" })}</span>
                <span className="tg-date">{formatKey(k, { month: "short", day: "numeric" })}</span>
              </button>
            );
          })}
        </div>
        {hasAllDay && (
          <div className="tg-allday" style={cols}>
            <div className="tg-gutter tg-allday-label">Due</div>
            {allDay.map((list, i) => (
              <div key={days[i]} className="tg-allday-cell">
                {list.map((item) => (
                  <EventChip key={item.id} item={item} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tg-body" style={{ ...cols, height: DAY_PX }}>
        <div className="tg-hours">
          {HOURS.map((h) => (
            <div key={h} className="tg-hour-label" style={{ top: h * HOUR_PX }}>
              {h === 0 ? "" : formatHour(h)}
            </div>
          ))}
        </div>
        {days.map((k) => {
          const timed = (itemsByDay.get(k) ?? []).filter((i) => !i.dateOnly);
          const classes = ["tg-col"];
          if (k === todayKey) classes.push("is-today");
          if (k === selected && !single) classes.push("is-selected");
          return (
            <div key={k} className={classes.join(" ")} onClick={() => onSelect(k)}>
              {HOURS.map((h) => (
                <div key={h} className="tg-line" style={{ top: h * HOUR_PX }} />
              ))}
              {layoutDay(timed, timeZone).map((p) => (
                <EventBlock key={p.item.id} item={p.item} top={p.top} height={BLOCK_PX} lane={p.lane} lanes={p.lanes} />
              ))}
              {k === todayKey && <div className="tg-now" style={{ top: nowTop }} aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
