"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CourseworkItem, CourseworkResponse, ItemType } from "@/lib/types";
import { useStoredState } from "@/lib/useStoredState";
import { AddItemForm } from "./AddItemForm";
import { ItemCard } from "./ItemCard";

type Sort = "due-asc" | "due-desc" | "course" | "points";
type TimeWindow = "recent" | "upcoming" | "all";

const CLIENT_TIMEOUT_MS = 45_000;
const RECENT_DAYS = 10;
const COMPLETE_STATUSES = new Set(["submitted", "graded", "excused"]);

const dueMs = (i: CourseworkItem) => new Date(i.dueDate!).getTime();

const SORTERS: Record<Sort, (a: CourseworkItem, b: CourseworkItem) => number> = {
  "due-asc": (a, b) => dueMs(a) - dueMs(b),
  "due-desc": (a, b) => dueMs(b) - dueMs(a),
  course: (a, b) => a.course.localeCompare(b.course) || dueMs(a) - dueMs(b),
  points: (a, b) => (b.points ?? -1) - (a.points ?? -1) || dueMs(a) - dueMs(b),
};

export function Tracker() {
  const [data, setData] = useState<CourseworkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const [view, setView] = useState<ItemType>("assignment");
  const [sort, setSort] = useState<Sort>("due-asc");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("recent");

  const [done, setDone] = useStoredState<Record<string, boolean>>("co-done", {});
  const [custom, setCustom] = useStoredState<CourseworkItem[]>("co-custom-items", []);
  const [saves, setSaves] = useStoredState<number>("co-saves", 0);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch("/api/coursework", { cache: "no-store", signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as CourseworkResponse);
    } catch {
      setFetchError("Couldn't reach the server right now. Your own items are still shown below.");
    } finally {
      clearTimeout(timer);
      setNow(new Date());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const timeZone = data?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const isComplete = useCallback(
    (i: CourseworkItem) => Boolean(done[i.id]) || COMPLETE_STATUSES.has(i.status ?? ""),
    [done],
  );
  const isOverdue = useCallback(
    (i: CourseworkItem) => i.dueDate != null && dueMs(i) < now.getTime() && !isComplete(i),
    [now, isComplete],
  );

  const allItems = useMemo(() => [...(data?.items ?? []), ...custom], [data, custom]);

  const inWindow = useCallback(
    (i: CourseworkItem) => {
      if (timeWindow === "all") return true;
      const cutoff = timeWindow === "upcoming" ? now.getTime() : now.getTime() - RECENT_DAYS * 86_400_000;
      return dueMs(i) >= cutoff;
    },
    [timeWindow, now],
  );

  const { dated, tba, counts, overdueCount } = useMemo(() => {
    const counts: Record<ItemType, number> = { assignment: 0, test: 0 };
    let overdueCount = 0;
    for (const i of allItems) {
      if (!i.dueDate || inWindow(i)) counts[i.type]++;
      if (isOverdue(i)) overdueCount++;
    }
    const ofType = allItems.filter((i) => i.type === view);
    return {
      dated: ofType.filter((i) => i.dueDate && inWindow(i)).sort(SORTERS[sort]),
      tba: ofType.filter((i) => !i.dueDate),
      counts,
      overdueCount,
    };
  }, [allItems, view, sort, inWindow, isOverdue]);

  const card = (i: CourseworkItem) => (
    <ItemCard
      key={i.id}
      item={i}
      timeZone={timeZone}
      now={now}
      done={Boolean(done[i.id])}
      overdue={isOverdue(i)}
      onToggleDone={() =>
        setDone((d) => {
          const next = { ...d };
          if (next[i.id]) delete next[i.id];
          else next[i.id] = true;
          return next;
        })
      }
      onDelete={i.id.startsWith("custom-") ? () => setCustom((c) => c.filter((x) => x.id !== i.id)) : undefined}
    />
  );

  // In date-sorted views, place a "today" divider between past-due and upcoming items.
  const listNodes: ReactNode[] = [];
  const dateSorted = sort === "due-asc" || sort === "due-desc";
  let dividerPlaced = !dateSorted;
  const todayDivider = (
    <li key="today-divider" className="today-divider" aria-label="Today">
      <span>
        Today ·{" "}
        {new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(now)}
      </span>
    </li>
  );
  for (const i of dated) {
    const isFuture = dueMs(i) >= now.getTime();
    if (!dividerPlaced && (sort === "due-asc" ? isFuture : !isFuture)) {
      listNodes.push(todayDivider);
      dividerPlaced = true;
    }
    listNodes.push(card(i));
  }
  if (!dividerPlaced) listNodes.push(todayDivider);

  const failedSources = data?.sources.filter((s) => !s.ok) ?? [];
  const warnedSources = data?.sources.filter((s) => s.ok && s.warnings.length > 0) ?? [];
  const nothingConfigured = data && data.sources.length === 0;

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <h1>Classwork Organizer</h1>
          <p className="muted">
            {loading
              ? "Fetching your coursework…"
              : overdueCount > 0
                ? `${overdueCount} overdue item${overdueCount === 1 ? "" : "s"}`
                : "Nothing overdue. Nice."}
          </p>
        </div>
        <div className="saves" title="Times this app saved you from missing something">
          <span>
            Saved me <strong>{saves}</strong> {saves === 1 ? "time" : "times"}
          </span>
          <button type="button" className="small" onClick={() => setSaves((n) => n + 1)} aria-label="Add one">
            +1
          </button>
          {saves > 0 && (
            <button type="button" className="small secondary" onClick={() => setSaves((n) => n - 1)} aria-label="Remove one">
              −1
            </button>
          )}
        </div>
      </header>

      <nav className="tabs" aria-label="Views">
        {(["assignment", "test"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={view === t ? "tab active" : "tab"}
            aria-current={view === t ? "page" : undefined}
            onClick={() => setView(t)}
          >
            {t === "assignment" ? "Assignments" : "Tests"} <span className="count">{counts[t]}</span>
          </button>
        ))}
      </nav>

      <div className="controls">
        <label>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="due-asc">Due date (earliest first)</option>
            <option value="due-desc">Due date (latest first)</option>
            <option value="course">Course</option>
            <option value="points">Points (most first)</option>
          </select>
        </label>
        <label>
          Show
          <select value={timeWindow} onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}>
            <option value="recent">Last {RECENT_DAYS} days &amp; upcoming</option>
            <option value="upcoming">Upcoming only</option>
            <option value="all">All dates</option>
          </select>
        </label>
        <button type="button" className="secondary" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="notices" aria-live="polite">
        {fetchError && <div className="notice notice-error">{fetchError}</div>}
        {failedSources.map((s) => (
          <div key={s.id} className="notice notice-error">
            Couldn&apos;t load <strong>{s.name}</strong> right now. {s.error}
          </div>
        ))}
        {warnedSources.map((s) => (
          <div key={s.id} className="notice notice-warn">
            <strong>{s.name}:</strong> {s.warnings.join(" ")}
          </div>
        ))}
        {nothingConfigured && (
          <div className="notice notice-info">
            No sources are configured yet. Set <code>CANVAS_BASE_URL</code>, <code>CANVAS_API_TOKEN</code>, and/or{" "}
            <code>COURSE_PAGES</code> as environment variables (see the README). You can still add your own items below.
          </div>
        )}
      </div>

      {loading && !data ? (
        <p className="empty">Loading coursework from your sources…</p>
      ) : (
        <>
          <ul className="items">
            {dated.length === 0 ? (
              <li className="empty">
                No {view === "assignment" ? "assignments" : "tests"} in this time window.
              </li>
            ) : (
              listNodes
            )}
          </ul>

          {tba.length > 0 && (
            <section className="tba">
              <h2>Date TBA</h2>
              <ul className="items">{tba.map(card)}</ul>
            </section>
          )}
        </>
      )}

      <AddItemForm defaultType={view} timeZone={timeZone} onAdd={(item) => setCustom((c) => [...c, item])} />

      <footer className="muted">
        Times shown in {timeZone}.
        {data && <> Last fetched {new Date(data.generatedAt).toLocaleTimeString("en-US", { timeZone })}.</>}
      </footer>
    </div>
  );
}
