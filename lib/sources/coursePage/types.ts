import type { ItemType } from "../../types";

export interface ParserContext {
  pageUrl: string;
  timeZone: string;
  now: Date;
}

/** What a page parser extracts; the course-page source turns these into CourseworkItems. */
export interface ParsedEntry {
  title: string;
  type: ItemType;
  dueDate: string | null;
  dateOnly: boolean;
  url: string | null;
  points?: number | null;
}

export interface ParsedPage {
  entries: ParsedEntry[];
  warnings: string[];
}

/** A parser takes raw HTML and returns entries. Throwing marks the source as failed. */
export type PageParser = (html: string, ctx: ParserContext) => ParsedPage;
