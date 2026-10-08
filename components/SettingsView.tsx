"use client";

import type { CourseColor } from "@/lib/courseColors";
import type { CourseworkResponse } from "@/lib/types";
import { RefreshIcon } from "./icons";

interface Props {
  data: CourseworkResponse | null;
  loading: boolean;
  timeZone: string;
  courseColors: Map<string, CourseColor>;
  onRefresh: () => void;
}

export function SettingsView({ data, loading, timeZone, courseColors, onRefresh }: Props) {
  return (
    <div className="settings">
      <section className="settings-section">
        <div className="settings-head">
          <h3>Sources</h3>
          <button type="button" className="btn btn-ghost" onClick={onRefresh} disabled={loading}>
            <RefreshIcon width={15} height={15} /> {loading ? "Refreshing…" : "Refresh now"}
          </button>
        </div>
        <p className="muted small">
          Sources are set with environment variables (<code>CANVAS_BASE_URL</code>, <code>CANVAS_API_TOKEN</code>,{" "}
          <code>COURSE_PAGES</code>). See the README to add or change them.
        </p>
        {data && data.sources.length === 0 && <p className="small">No sources are configured yet.</p>}
        <ul className="source-list">
          {data?.sources.map((s) => (
            <li key={s.id}>
              <span className={s.ok ? "source-dot ok" : "source-dot err"} />
              <div>
                <div className="source-name">
                  {s.name} <span className="muted small">{s.kind === "canvas" ? "Canvas" : "Course page"}</span>
                </div>
                <div className="small muted">
                  {s.ok ? `${s.itemCount} item${s.itemCount === 1 ? "" : "s"} loaded` : <span className="err-text">{s.error}</span>}
                </div>
                {s.warnings.map((w) => (
                  <div key={w} className="small warn-text">
                    {w}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="settings-section">
        <h3>Courses</h3>
        <ul className="course-legend">
          {[...courseColors.entries()].map(([course, c]) => (
            <li key={course}>
              <span className="dot" style={{ background: c.accent }} />
              {course}
            </li>
          ))}
          {courseColors.size === 0 && <li className="muted small">No courses yet.</li>}
        </ul>
      </section>

      <section className="settings-section">
        <h3>Display</h3>
        <p className="small">
          Times are shown in <strong>{timeZone}</strong>
          {data && <> · last fetched {new Date(data.generatedAt).toLocaleTimeString("en-US", { timeZone })}</>}.
        </p>
        <p className="muted small">Change the timezone with the <code>APP_TIMEZONE</code> environment variable.</p>
        {process.env.NEXT_PUBLIC_DATA_URL && (
          <p className="muted small">This copy is hosted on GitHub Pages, so Canvas and course pages are re-fetched about once an hour rather than live.</p>
        )}
      </section>
    </div>
  );
}
