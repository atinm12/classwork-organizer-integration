"use client";

import { useState, type FormEvent } from "react";
import type { DayKey } from "@/lib/calendar";
import { zonedTimeToUtc } from "@/lib/dates";
import type { CourseworkItem, ItemType } from "@/lib/types";
import { Dialog } from "./Dialog";

interface Props {
  defaultDate: DayKey;
  defaultType: ItemType;
  courses: string[];
  timeZone: string;
  onAdd: (item: CourseworkItem, completed: boolean) => void;
  onClose: () => void;
}

export function AddAssignmentDialog({ defaultDate, defaultType, courses, timeZone, onAdd, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [date, setDate] = useState<string>(defaultDate);
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ItemType>(defaultType);
  const [completed, setCompleted] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    let dueDate: string | null = null;
    if (date) {
      const [y, m, d] = date.split("-").map(Number);
      const [h, mi] = time ? time.split(":").map(Number) : [23, 59];
      // Interpret the entered wall-clock time in the app timezone, like every other source.
      dueDate = zonedTimeToUtc(y, m, d, h, mi, timeZone).toISOString();
    }

    onAdd(
      {
        id: `custom-${crypto.randomUUID()}`,
        course: course.trim() || "Personal",
        title: title.trim(),
        dueDate,
        type,
        points: null,
        url: null,
        status: null,
        source: "Personal",
        dateOnly: Boolean(date) && !time,
        description: description.trim() || undefined,
      },
      completed,
    );
  }

  return (
    <Dialog title={<h2>New assignment</h2>} onClose={onClose} className="add-dialog">
      <form className="form" onSubmit={submit}>
        <label className="field field-wide">
          <span>Assignment name</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Norton Illumina eBook Chapter 9" />
        </label>
        <label className="field field-wide">
          <span>Course</span>
          <input list="course-options" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="15-113" />
          <datalist id="course-options">
            {courses.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>Due date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Due time</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={!date} />
        </label>
        <label className="field field-wide">
          <span>Description</span>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes" />
        </label>
        <div className="field">
          <span>Type</span>
          <div className="segmented segmented-sm" role="radiogroup" aria-label="Type">
            {(["assignment", "test"] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={type === t} className={type === t ? "is-active" : ""} onClick={() => setType(t)}>
                {t === "assignment" ? "Assignment" : "Test"}
              </button>
            ))}
          </div>
        </div>
        <label className="field field-check">
          <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} />
          <span>Already completed</span>
        </label>
        <p className="muted small field-wide">Leave the date blank for “Date TBA”. Without a time, it’s due at end of day.</p>
        <div className="form-actions field-wide">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Add assignment
          </button>
        </div>
      </form>
    </Dialog>
  );
}
