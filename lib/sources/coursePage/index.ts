import { createHash } from "node:crypto";
import type { CoursePageConfig } from "../../config";
import type { CourseworkItem, SourceOutput } from "../../types";
import { SourceError } from "../errors";
import { genericParser } from "./genericParser";
import type { PageParser } from "./types";

const MAX_HTML_BYTES = 3 * 1024 * 1024;

/**
 * Parsers selectable per page via the "parser" field in COURSE_PAGES.
 * To support a page the generic parser handles poorly, add a parser here and point that page at it.
 */
export const PAGE_PARSERS: Record<string, PageParser> = {
  generic: genericParser,
};

function itemId(url: string, title: string, dueDate: string | null): string {
  return "page-" + createHash("sha1").update(`${url}|${title}|${dueDate}`).digest("hex").slice(0, 16);
}

async function fetchHtml(url: string, signal: AbortSignal): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "ClassworkOrganizer/1.0 (+schedule reader)", Accept: "text/html" },
      cache: "no-store",
      redirect: "follow",
      signal,
    });
  } catch (err) {
    if (signal.aborted) throw err;
    throw new SourceError("The page couldn't be reached.");
  }
  if (!res.ok) throw new SourceError(`The page responded with HTTP ${res.status}.`);
  const type = res.headers.get("content-type") ?? "";
  if (type && !/html|xml|text\/plain/i.test(type)) {
    throw new SourceError("The URL doesn't point to an HTML page.");
  }
  const html = await res.text();
  if (html.length > MAX_HTML_BYTES) throw new SourceError("The page is too large to read.");
  return html;
}

export async function loadCoursePage(
  page: CoursePageConfig,
  timeZone: string,
  signal: AbortSignal,
): Promise<SourceOutput> {
  const parser = PAGE_PARSERS[page.parser];
  if (!parser) throw new SourceError(`Unknown parser "${page.parser}".`);

  const html = await fetchHtml(page.url, signal);

  let parsed;
  try {
    parsed = parser(html, { pageUrl: page.url, timeZone, now: new Date() });
  } catch (err) {
    console.error(`Parser failed for ${page.url}`, err);
    throw new SourceError("The page's layout couldn't be parsed.");
  }

  const seen = new Set<string>();
  const items: CourseworkItem[] = [];
  for (const e of parsed.entries) {
    const key = `${e.type}|${e.title.toLowerCase()}|${e.dueDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: itemId(page.url, e.title, e.dueDate),
      course: page.course,
      title: e.title,
      dueDate: e.dueDate,
      type: e.type,
      points: e.points ?? null,
      url: e.url ?? page.url,
      status: null,
      source: page.label,
      dateOnly: e.dateOnly,
    });
  }

  const warnings = [...parsed.warnings];
  if (items.length === 0) {
    warnings.push(
      "No dated assignments or tests were found. The page may build its content with JavaScript, which can't be read here.",
    );
  }
  return { items, warnings };
}
