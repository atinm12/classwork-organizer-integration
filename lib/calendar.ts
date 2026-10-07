// Calendar math on "day keys" (YYYY-MM-DD strings) in the app timezone. Working with keys
// instead of Date objects keeps the grid independent of the viewer's own timezone.

import { zonedParts } from "./dates";
import type { CourseworkItem } from "./types";

export type DayKey = string;
export type CalendarView = "day" | "week" | "month";

const pad = (n: number) => String(n).padStart(2, "0");

export function makeKey(y: number, m: number, d: number): DayKey {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseKey(k: DayKey): { y: number; m: number; d: number } {
  const [y, m, d] = k.split("-").map(Number);
  return { y, m, d };
}

function keyToUtc(k: DayKey): Date {
  const { y, m, d } = parseKey(k);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function utcToKey(dt: Date): DayKey {
  return makeKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function dayKeyOf(date: Date, timeZone: string): DayKey {
  const p = zonedParts(date, timeZone);
  return makeKey(p.year, p.month, p.day);
}

export function itemDayKey(item: CourseworkItem, timeZone: string): DayKey | null {
  return item.dueDate ? dayKeyOf(new Date(item.dueDate), timeZone) : null;
}

/** Minutes after local midnight that the item is due. */
export function itemMinutes(item: CourseworkItem, timeZone: string): number {
  const p = zonedParts(new Date(item.dueDate!), timeZone);
  return p.hour * 60 + p.minute;
}

export function addDays(k: DayKey, n: number): DayKey {
  const dt = keyToUtc(k);
  dt.setUTCDate(dt.getUTCDate() + n);
  return utcToKey(dt);
}

export function addMonths(k: DayKey, n: number): DayKey {
  const { y, m, d } = parseKey(k);
  const first = new Date(Date.UTC(y, m - 1 + n, 1, 12));
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return makeKey(first.getUTCFullYear(), first.getUTCMonth() + 1, Math.min(d, daysInMonth));
}

export function weekdayOf(k: DayKey): number {
  return keyToUtc(k).getUTCDay();
}

export function startOfWeek(k: DayKey): DayKey {
  return addDays(k, -weekdayOf(k));
}

export function weekDays(k: DayKey): DayKey[] {
  const start = startOfWeek(k);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Every day shown in the month grid for `k`'s month, padded to whole Sunday-first weeks. */
export function monthGrid(k: DayKey): DayKey[] {
  const { y, m } = parseKey(k);
  const first = makeKey(y, m, 1);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = weekdayOf(first);
  const weeks = Math.ceil((lead + daysInMonth) / 7);
  const start = addDays(first, -lead);
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
}

export function sameMonth(a: DayKey, b: DayKey): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Formats a day key (no timezone shifting — the key is already local). */
export function formatKey(k: DayKey, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(keyToUtc(k));
}

export function formatTime(item: CourseworkItem, timeZone: string): string {
  if (!item.dueDate) return "TBA";
  if (item.dateOnly) return "All day";
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(
    new Date(item.dueDate),
  );
}

/** Compact time for month chips: "9a", "11:59p". */
export function formatShortTime(item: CourseworkItem, timeZone: string): string {
  if (!item.dueDate || item.dateOnly) return "";
  const p = zonedParts(new Date(item.dueDate), timeZone);
  const h = p.hour % 12 || 12;
  return `${h}${p.minute ? `:${pad(p.minute)}` : ""}${p.hour < 12 ? "a" : "p"}`;
}

export function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export function rangeTitle(view: CalendarView, cursor: DayKey): string {
  if (view === "week") {
    const days = weekDays(cursor);
    const a = days[0];
    const b = days[6];
    if (sameMonth(a, b)) return formatKey(a, { month: "long", year: "numeric" });
    const sameYear = a.slice(0, 4) === b.slice(0, 4);
    return sameYear
      ? `${formatKey(a, { month: "short" })} – ${formatKey(b, { month: "short", year: "numeric" })}`
      : `${formatKey(a, { month: "short", year: "numeric" })} – ${formatKey(b, { month: "short", year: "numeric" })}`;
  }
  return formatKey(cursor, { month: "long", year: "numeric" });
}

/** Sorts items for display within a day: timed items by time, all-day items first. */
export function byTime(a: CourseworkItem, b: CourseworkItem): number {
  if (a.dateOnly !== b.dateOnly) return a.dateOnly ? -1 : 1;
  return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime() || a.title.localeCompare(b.title);
}
