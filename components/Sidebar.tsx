"use client";

import { CalendarIcon, ListIcon, LogoMark, SettingsIcon, TestIcon } from "./icons";

export type Section = "calendar" | "assignments" | "tests" | "settings";

const NAV: { id: Section; label: string; Icon: typeof CalendarIcon }[] = [
  { id: "calendar", label: "Calendar", Icon: CalendarIcon },
  { id: "assignments", label: "Assignments", Icon: ListIcon },
  { id: "tests", label: "Tests", Icon: TestIcon },
  { id: "settings", label: "Settings", Icon: SettingsIcon },
];

export function Sidebar({
  section,
  onSection,
  saves,
  onSave,
}: {
  section: Section;
  onSection: (s: Section) => void;
  saves: number;
  onSave: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <LogoMark />
        <span className="brand-name">
          Classwork
          <br />
          Organizer
        </span>
      </div>
      <nav className="nav" aria-label="Sections">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={section === id ? "nav-item is-active" : "nav-item"}
            aria-current={section === id ? "page" : undefined}
            onClick={() => onSection(id)}
            title={label}
          >
            <Icon />
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <p className="tagline">
          Small steps,
          <br />
          big progress.
        </p>
        <button type="button" className="saves-mini" onClick={onSave} title="Tally a time this app saved you from missing something">
          Saved me <strong>{saves}</strong>× <span className="saves-plus">+1</span>
        </button>
      </div>
    </aside>
  );
}
