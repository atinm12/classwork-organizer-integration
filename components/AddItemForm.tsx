"use client";

import { useState, type FormEvent } from "react";
import { zonedTimeToUtc } from "@/lib/dates";
import type { CourseworkItem, ItemType } from "@/lib/types";

interface Props {
  defaultType: ItemType;
  timeZone: string;
  onAdd: (item: CourseworkItem) => void;
}

export function AddItemForm({ defaultType, timeZone, onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [type, setType] = useState<ItemType>(defaultType);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

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

    onAdd({
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
    });
    setTitle("");
    setDate("");
    setTime("");
  }

  return (
    <details className="panel add-form">
      <summary>+ Add your own assignment or test</summary>
      <form onSubmit={submit}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Chapter 5 reading quiz" />
        </label>
        <label>
          Course
          <input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="BIO 101" />
        </label>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value as ItemType)}>
            <option value="assignment">Assignment</option>
            <option value="test">Test</option>
          </select>
        </label>
        <label>
          Due date <span className="muted">(leave blank for TBA)</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Time <span className="muted">(optional)</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={!date} />
        </label>
        <div className="form-actions">
          <button type="submit">Add</button>
        </div>
      </form>
    </details>
  );
}
