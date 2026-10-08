"use client";

import type { CourseColor } from "@/lib/courseColors";
import type { CourseworkResponse } from "@/lib/types";

interface Props {
  data: CourseworkResponse | null;
  timeZone: string;
  courseColors: Map<string, CourseColor>;
}

export function SettingsView({ data, timeZone, courseColors }: Props) {
  return (
    <div className="settings">
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
