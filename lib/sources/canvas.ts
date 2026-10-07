import type { CanvasConfig } from "../config";
import type { CourseworkItem, SourceOutput } from "../types";
import { SourceError } from "./errors";

const MAX_PAGES = 10;

interface CanvasCourse {
  id: number;
  name?: string;
  course_code?: string;
  access_restricted_by_date?: boolean;
}

interface CanvasSubmission {
  workflow_state?: string;
  submitted_at?: string | null;
  missing?: boolean;
  excused?: boolean | null;
}

interface CanvasAssignment {
  id: number;
  name: string;
  due_at: string | null;
  points_possible: number | null;
  html_url?: string;
  submission_types?: string[];
  is_quiz_assignment?: boolean;
  is_quiz_lti_assignment?: boolean;
  quiz_id?: number;
  published?: boolean;
  submission?: CanvasSubmission;
}

function nextLink(header: string | null): string | null {
  if (!header) return null;
  const match = header.split(",").find((part) => /rel="next"/.test(part));
  return match?.match(/<([^>]+)>/)?.[1] ?? null;
}

/** GETs every page of a Canvas list endpoint, following Link headers on the same host only. */
async function getAll<T>(path: string, config: CanvasConfig, signal: AbortSignal): Promise<T[]> {
  const results: T[] = [];
  let url: string | null = `${config.baseUrl}${path}`;
  for (let page = 0; url && page < MAX_PAGES; page++) {
    // Never send the token to a different host, even if a Link header points there.
    if (new URL(url).origin !== config.baseUrl) break;
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.token}`, Accept: "application/json" },
      cache: "no-store",
      signal,
    });
    if (res.status === 401) {
      throw new SourceError("Canvas rejected the access token. Check CANVAS_API_TOKEN.");
    }
    if (!res.ok) throw new SourceError(`Canvas responded with HTTP ${res.status}.`);
    const body = (await res.json()) as T[];
    if (!Array.isArray(body)) throw new SourceError("Canvas returned an unexpected response.");
    results.push(...body);
    url = nextLink(res.headers.get("link"));
  }
  return results;
}

export function classifyCanvasAssignment(a: CanvasAssignment): "test" | "assignment" {
  const quizBacked =
    a.submission_types?.includes("online_quiz") ||
    a.is_quiz_assignment ||
    a.is_quiz_lti_assignment ||
    a.quiz_id != null;
  return quizBacked ? "test" : "assignment";
}

function submissionStatus(s: CanvasSubmission | undefined): string | null {
  if (!s) return null;
  if (s.excused) return "excused";
  if (s.workflow_state === "graded") return "graded";
  if (s.submitted_at || s.workflow_state === "submitted" || s.workflow_state === "pending_review") {
    return "submitted";
  }
  if (s.missing) return "missing";
  return null;
}

export async function loadCanvas(config: CanvasConfig, signal: AbortSignal): Promise<SourceOutput> {
  const courses = (
    await getAll<CanvasCourse>("/api/v1/courses?enrollment_state=active&per_page=100", config, signal)
  ).filter((c) => !c.access_restricted_by_date);

  const perCourse = await Promise.allSettled(
    courses.map(async (course) => {
      const assignments = await getAll<CanvasAssignment>(
        `/api/v1/courses/${course.id}/assignments?per_page=100&include[]=submission&order_by=due_at`,
        config,
        signal,
      );
      return { course, assignments };
    }),
  );

  const items: CourseworkItem[] = [];
  const warnings: string[] = [];
  let skipped = 0;

  for (const result of perCourse) {
    if (result.status === "rejected") {
      if (signal.aborted) throw result.reason;
      skipped++;
      continue;
    }
    const { course, assignments } = result.value;
    const courseName = course.name || course.course_code || `Course ${course.id}`;
    for (const a of assignments) {
      if (a.published === false) continue;
      items.push({
        id: `canvas-${course.id}-${a.id}`,
        course: courseName,
        title: a.name,
        dueDate: a.due_at ? new Date(a.due_at).toISOString() : null,
        type: classifyCanvasAssignment(a),
        points: typeof a.points_possible === "number" ? a.points_possible : null,
        url: a.html_url ?? null,
        status: submissionStatus(a.submission),
        source: "Canvas",
      });
    }
  }

  if (skipped > 0) {
    warnings.push(`Skipped ${skipped} course${skipped === 1 ? "" : "s"} whose assignments Canvas wouldn't return.`);
  }
  if (courses.length === 0) warnings.push("No active Canvas courses found for this account.");
  return { items, warnings };
}
