"use client";

import { createContext, useContext } from "react";
import type { DayKey } from "@/lib/calendar";
import type { CourseColor } from "@/lib/courseColors";
import type { CourseworkItem } from "@/lib/types";

/** Shared helpers every calendar component needs, so they aren't threaded through props. */
export interface TrackerCtx {
  timeZone: string;
  now: Date;
  todayKey: DayKey;
  isComplete: (item: CourseworkItem) => boolean;
  isOverdue: (item: CourseworkItem) => boolean;
  colorOf: (course: string) => CourseColor;
  openItem: (item: CourseworkItem) => void;
  toggleDone: (item: CourseworkItem) => void;
}

export const TrackerContext = createContext<TrackerCtx | null>(null);

export function useTracker(): TrackerCtx {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error("useTracker must be used inside TrackerContext");
  return ctx;
}
