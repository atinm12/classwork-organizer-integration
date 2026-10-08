"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  dayKeyOf,
  formatKey,
  itemDayKey,
  rangeTitle,
  weekDays,
  type CalendarView,
  type DayKey,
} from "@/lib/calendar";
import { buildCourseColors, PALETTE } from "@/lib/courseColors";
import type { CourseworkItem, CourseworkResponse, ItemType } from "@/lib/types";
import { useStoredState } from "@/lib/useStoredState";
import { AddAssignmentDialog } from "./AddAssignmentDialog";
import { AgendaList } from "./AgendaList";
import { MonthView } from "./calendar/MonthView";
import { TimeGrid } from "./calendar/TimeGrid";
import { EventDetail } from "./EventDetail";
import { ChevronLeft, ChevronRight, FilterIcon, PlusIcon } from "./icons";
import { RightPanel } from "./RightPanel";
import { SettingsView } from "./SettingsView";
import { Sidebar, type Section } from "./Sidebar";
import { TopBar } from "./TopBar";
import { TrackerContext, type TrackerCtx } from "./TrackerContext";

const CLIENT_TIMEOUT_MS = 45_000;
// On GitHub Pages this points at the JSON snapshot the workflow generates; otherwise the live API.
const DATA_URL = process.env.NEXT_PUBLIC_DATA_URL || "/api/coursework";
const COMPLETE_STATUSES = new Set(["submitted", "graded", "excused"]);
const VIEWS: CalendarView[] = ["day", "week", "month"];

function matches(item: CourseworkItem, q: string): boolean {
  return [item.title, item.course, item.source, item.description ?? "", item.type].some((s) => s.toLowerCase().includes(q));
}

function CourseFilter({
  courses,
  hidden,
  onChange,
  colorOf,
}: {
  courses: string[];
  hidden: string[];
  onChange: (h: string[]) => void;
  colorOf: TrackerCtx["colorOf"];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const shown = courses.length - courses.filter((c) => hidden.includes(c)).length;
  return (
    <div className="popover-anchor" ref={ref}>
      <button type="button" className={hidden.length ? "btn btn-ghost is-filtering" : "btn btn-ghost"} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <FilterIcon width={15} height={15} />
        {hidden.length ? `${shown} of ${courses.length} courses` : "All courses"}
      </button>
      {open && (
        <div className="popover course-popover">
          {courses.length === 0 && <p className="muted small">No courses loaded yet.</p>}
          {courses.map((c) => (
            <label key={c} className="course-option">
              <input
                type="checkbox"
                checked={!hidden.includes(c)}
                onChange={(e) => onChange(e.target.checked ? hidden.filter((h) => h !== c) : [...hidden, c])}
              />
              <span className="dot" style={{ background: colorOf(c).accent }} />
              <span>{c}</span>
            </label>
          ))}
          {hidden.length > 0 && (
            <button type="button" className="text-btn" onClick={() => onChange([])}>
              Show all courses
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Tracker() {
  const [data, setData] = useState<CourseworkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const [section, setSection] = useStoredState<Section>("co-section", "calendar");
  const [view, setView] = useStoredState<CalendarView>("co-view", "week");
  const [cursorState, setCursor] = useState<DayKey | null>(null);
  const [selectedState, setSelected] = useState<DayKey | null>(null);
  const [query, setQuery] = useState("");
  const [hiddenCourses, setHiddenCourses] = useStoredState<string[]>("co-hidden-courses", []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [done, setDone] = useStoredState<Record<string, boolean>>("co-done", {});
  const [custom, setCustom] = useStoredState<CourseworkItem[]>("co-custom-items", []);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch(DATA_URL, { cache: "no-store", signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as CourseworkResponse);
    } catch {
      setFetchError("Couldn't reach the server right now. Your own assignments are still shown.");
    } finally {
      clearTimeout(timer);
      setNow(new Date());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keep "now" fresh so the current-time line and overdue flags don't go stale.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const timeZone = data?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayKey = dayKeyOf(now, timeZone);
  const cursor = cursorState ?? todayKey;
  const selected = selectedState ?? todayKey;

  const allItems = useMemo(() => [...(data?.items ?? []), ...custom], [data, custom]);
  const courses = useMemo(() => [...new Set(allItems.map((i) => i.course))].sort((a, b) => a.localeCompare(b)), [allItems]);
  const courseColors = useMemo(() => buildCourseColors(courses), [courses]);

  const isComplete = useCallback((i: CourseworkItem) => Boolean(done[i.id]) || COMPLETE_STATUSES.has(i.status ?? ""), [done]);
  const isOverdue = useCallback(
    (i: CourseworkItem) => i.dueDate != null && new Date(i.dueDate).getTime() < now.getTime() && !isComplete(i),
    [now, isComplete],
  );
  const toggleDone = useCallback(
    (i: CourseworkItem) =>
      setDone((d) => {
        const next = { ...d };
        if (next[i.id]) delete next[i.id];
        else next[i.id] = true;
        return next;
      }),
    [setDone],
  );

  const ctx: TrackerCtx = useMemo(
    () => ({
      timeZone,
      now,
      todayKey,
      isComplete,
      isOverdue,
      colorOf: (course) => courseColors.get(course) ?? PALETTE.blue,
      openItem: (i) => setOpenId(i.id),
      toggleDone,
    }),
    [timeZone, now, todayKey, isComplete, isOverdue, courseColors, toggleDone],
  );

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => allItems.filter((i) => !hiddenCourses.includes(i.course) && (!q || matches(i, q))),
    [allItems, hiddenCourses, q],
  );
  const searchResults = useMemo(() => (q ? allItems.filter((i) => matches(i, q)) : []), [allItems, q]);

  const itemsByDay = useMemo(() => {
    const map = new Map<DayKey, CourseworkItem[]>();
    for (const i of visible) {
      const k = itemDayKey(i, timeZone);
      if (!k) continue;
      const list = map.get(k);
      if (list) list.push(i);
      else map.set(k, [i]);
    }
    return map;
  }, [visible, timeZone]);
  const tbaItems = visible.filter((i) => !i.dueDate);

  const goTo = (k: DayKey) => {
    setCursor(k);
    setSelected(k);
  };
  const step = (dir: 1 | -1) => {
    const next = view === "month" ? addMonths(cursor, dir) : addDays(cursor, view === "week" ? 7 * dir : dir);
    setCursor(next);
    if (view !== "month") setSelected(view === "day" ? next : addDays(selected, 7 * dir));
  };
  const changeView = (v: CalendarView) => {
    setView(v);
    setCursor(selected);
  };
  const openDay = (k: DayKey) => {
    goTo(k);
    setView("day");
    setSection("calendar");
  };
  const selectDay = (k: DayKey) => {
    setSelected(k);
    if (view === "day") setCursor(k);
  };

  const openItem = allItems.find((i) => i.id === openId) ?? null;
  const failed = data?.sources.filter((s) => !s.ok) ?? [];
  const noteCount = data?.sources.filter((s) => s.ok && s.warnings.length).length ?? 0;

  const dayItems = itemsByDay.get(cursor) ?? [];
  const daySummary = (
    <p className="day-summary">
      {dayItems.length === 0
        ? "Nothing due"
        : [
            `${dayItems.filter((i) => i.type === "assignment").length} assignment${dayItems.filter((i) => i.type === "assignment").length === 1 ? "" : "s"}`,
            `${dayItems.filter((i) => i.type === "test").length} test${dayItems.filter((i) => i.type === "test").length === 1 ? "" : "s"}`,
            `${dayItems.filter(isComplete).length} completed`,
          ].join(" · ")}
    </p>
  );

  const sectionTitle: Record<Section, string> = {
    calendar: rangeTitle(view, cursor),
    assignments: "Assignments",
    tests: "Tests",
    settings: "Settings",
  };

  return (
    <TrackerContext.Provider value={ctx}>
      <div className="app">
        <Sidebar section={section} onSection={setSection} />

        <div className="main">
          <TopBar
            query={query}
            onQuery={setQuery}
            results={searchResults}
            onPick={(i) => {
              const k = itemDayKey(i, timeZone);
              if (k) {
                goTo(k);
                setSection("calendar");
              }
              setOpenId(i.id);
            }}
          />

          <div className={section === "calendar" && view !== "month" ? "workspace has-panel" : "workspace"}>
            <section className="surface" aria-busy={loading}>
              <div className="toolbar">
                <h1 className="toolbar-title">
                  {sectionTitle[section]}
                  {loading && <span className="loading-dot" aria-label="Loading" />}
                </h1>
                <div className="toolbar-actions">
                  {section !== "settings" && (
                    <CourseFilter courses={courses} hidden={hiddenCourses} onChange={setHiddenCourses} colorOf={ctx.colorOf} />
                  )}
                  {section !== "settings" && (
                    <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
                      <PlusIcon width={15} height={15} /> Add
                    </button>
                  )}
                  {section === "calendar" && (
                    <>
                      <div className="segmented" role="tablist" aria-label="Calendar view">
                        {VIEWS.map((v) => (
                          <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "is-active" : ""} onClick={() => changeView(v)}>
                            {v[0].toUpperCase() + v.slice(1)}
                          </button>
                        ))}
                      </div>
                      <div className="icon-pair">
                        <button type="button" className="icon-btn" onClick={() => step(-1)} aria-label={`Previous ${view}`}>
                          <ChevronLeft />
                        </button>
                        <button type="button" className="icon-btn" onClick={() => step(1)} aria-label={`Next ${view}`}>
                          <ChevronRight />
                        </button>
                      </div>
                      <button type="button" className="btn btn-ghost" onClick={() => goTo(todayKey)}>
                        Today
                      </button>
                    </>
                  )}
                </div>
              </div>

              {(fetchError || failed.length > 0 || (noteCount > 0 && section !== "settings")) && (
                <div className="notices" aria-live="polite">
                  {fetchError && <p className="notice">{fetchError}</p>}
                  {failed.map((s) => (
                    <p key={s.id} className="notice">
                      Couldn&apos;t load <strong>{s.name}</strong> right now. {s.error}
                    </p>
                  ))}
                  {noteCount > 0 && section !== "settings" && (
                    <p className="notice notice-soft">
                      {noteCount} source{noteCount === 1 ? " has a note" : "s have notes"}.{" "}
                      <button type="button" className="text-btn" onClick={() => setSection("settings")}>
                        View in Settings
                      </button>
                    </p>
                  )}
                </div>
              )}

              {q && section === "calendar" && (
                <p className="filter-note">
                  Showing {visible.length} match{visible.length === 1 ? "" : "es"} for “{query.trim()}”.{" "}
                  <button type="button" className="text-btn" onClick={() => setQuery("")}>
                    Clear search
                  </button>
                </p>
              )}

              <div className="surface-body">
                {section === "calendar" && view === "month" && (
                  <MonthView cursor={cursor} selected={selected} itemsByDay={itemsByDay} onSelect={selectDay} onOpenDay={openDay} />
                )}
                {section === "calendar" && view === "week" && (
                  <TimeGrid days={weekDays(cursor)} selected={selected} itemsByDay={itemsByDay} onSelect={selectDay} onOpenDay={openDay} />
                )}
                {section === "calendar" && view === "day" && (
                  <TimeGrid days={[cursor]} selected={selected} itemsByDay={itemsByDay} onSelect={selectDay} onOpenDay={openDay} summary={daySummary} />
                )}
                {section === "assignments" && <AgendaList type="assignment" items={visible} />}
                {section === "tests" && <AgendaList type="test" items={visible} />}
                {section === "settings" && (
                  <SettingsView
                    data={data}
                    loading={loading}
                    timeZone={timeZone}
                    courseColors={courseColors}
                    onRefresh={load}
                  />
                )}
              </div>

              {section === "calendar" && view === "month" && tbaItems.length > 0 && (
                <p className="filter-note">
                  {tbaItems.length} item{tbaItems.length === 1 ? " has" : "s have"} no date yet.{" "}
                  <button type="button" className="text-btn" onClick={() => setSection("assignments")}>
                    See Date TBA
                  </button>
                </p>
              )}
            </section>

            {section === "calendar" && view !== "month" && (
              <RightPanel
                selected={selected}
                onSelect={selectDay}
                itemsByDay={itemsByDay}
                visibleItems={visible}
                tbaItems={tbaItems}
                onViewAll={() => setSection("assignments")}
              />
            )}
          </div>

          <footer className="foot muted">
            Times in {timeZone}
            {data && <> · updated {new Date(data.generatedAt).toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" })}</>}
            {" · "}
            {formatKey(todayKey, { weekday: "long", month: "long", day: "numeric" })}
          </footer>
        </div>

        {openItem && (
          <EventDetail
            item={openItem}
            manuallyDone={Boolean(done[openItem.id])}
            onClose={() => setOpenId(null)}
            onDelete={
              openItem.id.startsWith("custom-")
                ? () => {
                    setCustom((c) => c.filter((x) => x.id !== openItem.id));
                    setOpenId(null);
                  }
                : undefined
            }
          />
        )}
        {adding && (
          <AddAssignmentDialog
            defaultDate={selected}
            defaultType={(section === "tests" ? "test" : "assignment") as ItemType}
            courses={courses}
            timeZone={timeZone}
            onClose={() => setAdding(false)}
            onAdd={(item, completed) => {
              setCustom((c) => [...c, item]);
              if (completed) setDone((d) => ({ ...d, [item.id]: true }));
              setAdding(false);
              const k = itemDayKey(item, timeZone);
              if (k && section === "calendar") goTo(k);
            }}
          />
        )}
      </div>
    </TrackerContext.Provider>
  );
}
