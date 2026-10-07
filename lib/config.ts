import { isValidTimeZone } from "./dates";

export const DEFAULT_TIMEOUT_MS = 10_000;

export function getTimeZone(): string {
  const tz = process.env.APP_TIMEZONE?.trim();
  return tz && isValidTimeZone(tz) ? tz : "UTC";
}

export function getSourceTimeoutMs(): number {
  const n = Number(process.env.SOURCE_TIMEOUT_MS);
  return Number.isFinite(n) && n >= 1000 && n <= 60_000 ? n : DEFAULT_TIMEOUT_MS;
}

export interface CanvasConfig {
  baseUrl: string;
  token: string;
}

/** Returns null when Canvas isn't configured; throws a readable message when misconfigured. */
export function getCanvasConfig(): CanvasConfig | null {
  const rawUrl = process.env.CANVAS_BASE_URL?.trim();
  const token = process.env.CANVAS_API_TOKEN?.trim();
  if (!rawUrl && !token) return null;
  if (!rawUrl || !token) {
    throw new Error("Canvas needs both CANVAS_BASE_URL and CANVAS_API_TOKEN to be set.");
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("CANVAS_BASE_URL isn't a valid URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("CANVAS_BASE_URL must start with https://.");
  }
  return { baseUrl: url.origin, token };
}

export interface CoursePageConfig {
  label: string;
  url: string;
  course: string;
  parser: string;
}

/** Parses COURSE_PAGES. Bad entries are reported individually instead of failing the whole list. */
export function getCoursePageConfigs(): { pages: CoursePageConfig[]; errors: string[] } {
  const raw = process.env.COURSE_PAGES?.trim();
  if (!raw) return { pages: [], errors: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { pages: [], errors: ["COURSE_PAGES isn't valid JSON."] };
  }
  if (!Array.isArray(parsed)) {
    return { pages: [], errors: ["COURSE_PAGES must be a JSON array of { label, url } objects."] };
  }

  const pages: CoursePageConfig[] = [];
  const errors: string[] = [];
  parsed.forEach((entry, i) => {
    const e = entry as Record<string, unknown>;
    const label = typeof e?.label === "string" ? e.label.trim() : "";
    const url = typeof e?.url === "string" ? e.url.trim() : "";
    let valid = false;
    try {
      const u = new URL(url);
      valid = u.protocol === "https:" || u.protocol === "http:";
    } catch {}
    if (!label || !valid) {
      errors.push(`COURSE_PAGES entry ${i + 1} needs a "label" and an http(s) "url".`);
      return;
    }
    pages.push({
      label,
      url,
      course: typeof e.course === "string" && e.course.trim() ? e.course.trim() : label,
      parser: typeof e.parser === "string" && e.parser.trim() ? e.parser.trim() : "generic",
    });
  });
  return { pages, errors };
}
