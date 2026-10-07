export type ItemType = "assignment" | "test";

/** The shared shape every source produces. */
export interface CourseworkItem {
  id: string;
  course: string;
  title: string;
  /** ISO 8601 instant, or null when no date is confirmed. */
  dueDate: string | null;
  type: ItemType;
  points: number | null;
  url: string | null;
  status: string | null;
  source: string;
  /** True when the source gave a date but no time; dueDate is then 11:59 PM in the app timezone. */
  dateOnly?: boolean;
}

export type SourceKind = "canvas" | "course-page";

/** What a source module returns when it succeeds. */
export interface SourceOutput {
  items: CourseworkItem[];
  /** Non-fatal problems worth showing (e.g. "no dated items found"). */
  warnings: string[];
}

/** Per-source outcome reported to the frontend. */
export interface SourceStatus {
  id: string;
  name: string;
  kind: SourceKind;
  ok: boolean;
  error: string | null;
  warnings: string[];
  itemCount: number;
}

export interface CourseworkResponse {
  generatedAt: string;
  timeZone: string;
  sources: SourceStatus[];
  items: CourseworkItem[];
}
