import { zonedParts, zonedTimeToUtc } from "../../dates";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const MONTH_RE = "(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*\\.?";

const PATTERNS: { re: RegExp; read: (m: RegExpExecArray) => [number | null, number, number] }[] = [
  // 2026-10-12
  { re: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, read: (m) => [+m[1], +m[2], +m[3]] },
  // Oct 12, October 12th 2026
  {
    re: new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4})\\b)?`, "i"),
    read: (m) => [m[3] ? +m[3] : null, MONTHS[m[1].toLowerCase()], +m[2]],
  },
  // 12 Oct, 12th October 2026
  {
    re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}(?:,?\\s+(\\d{4})\\b)?`, "i"),
    read: (m) => [m[3] ? +m[3] : null, MONTHS[m[2].toLowerCase()], +m[1]],
  },
  // 10/12, 10/12/26, 10/12/2026 (US month/day order)
  {
    re: /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\b/,
    read: (m) => [m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null, +m[1], +m[2]],
  },
];

const TIME_12H = /\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?(?![a-z])/i;
const TIME_24H = /\b([01]?\d|2[0-3]):([0-5]\d)\b/;
const NOON_MIDNIGHT = /\b(noon|midnight)\b/i;

export interface FoundDate {
  /** ISO instant. */
  iso: string;
  dateOnly: boolean;
  /** The matched date (and time, if any) text, so callers can strip it from titles. */
  matched: string[];
}

function isRealDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Without a year, pick the year that puts the date closest to today (school terms are short). */
function inferYear(month: number, day: number, now: Date, timeZone: string): number {
  const today = zonedParts(now, timeZone);
  const todayMs = Date.UTC(today.year, today.month - 1, today.day);
  let best = today.year;
  let bestDist = Infinity;
  for (const y of [today.year - 1, today.year, today.year + 1]) {
    if (!isRealDate(y, month, day)) continue;
    const dist = Math.abs(Date.UTC(y, month - 1, day) - todayMs);
    if (dist < bestDist) {
      best = y;
      bestDist = dist;
    }
  }
  return best;
}

function findTime(text: string): { hour: number; minute: number; matched: string } | null {
  const t12 = TIME_12H.exec(text);
  if (t12) {
    let hour = +t12[1] % 12;
    if (t12[3].toLowerCase() === "p") hour += 12;
    const minute = t12[2] ? +t12[2] : 0;
    if (+t12[1] <= 12 && minute < 60) return { hour, minute, matched: t12[0] };
  }
  const nm = NOON_MIDNIGHT.exec(text);
  if (nm) {
    // "Midnight" on a due date almost always means the end of that day.
    return nm[1].toLowerCase() === "noon"
      ? { hour: 12, minute: 0, matched: nm[0] }
      : { hour: 23, minute: 59, matched: nm[0] };
  }
  const t24 = TIME_24H.exec(text);
  if (t24) return { hour: +t24[1], minute: +t24[2], matched: t24[0] };
  return null;
}

/** Finds the first date in `text`, interpreted in `timeZone`. Date-only matches get 11:59 PM. */
export function findDate(text: string, now: Date, timeZone: string): FoundDate | null {
  let best: { index: number; matched: string; y: number | null; m: number; d: number } | null = null;
  for (const { re, read } of PATTERNS) {
    const m = re.exec(text);
    if (!m) continue;
    const [y, mo, d] = read(m);
    if (!mo || !isRealDate(y ?? 2024, mo, d)) continue;
    if (!best || m.index < best.index) best = { index: m.index, matched: m[0], y, m: mo, d };
  }
  if (!best) return null;

  const year = best.y ?? inferYear(best.m, best.d, now, timeZone);
  if (!isRealDate(year, best.m, best.d)) return null;

  const rest = text.replace(best.matched, " ");
  const time = findTime(rest);
  const instant = zonedTimeToUtc(year, best.m, best.d, time?.hour ?? 23, time?.minute ?? 59, timeZone);
  return {
    iso: instant.toISOString(),
    dateOnly: !time,
    matched: time ? [best.matched, time.matched] : [best.matched],
  };
}
