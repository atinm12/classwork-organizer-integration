import { getCanvasConfig, getCoursePageConfigs, getSourceTimeoutMs, getTimeZone } from "../config";
import type { CourseworkItem, CourseworkResponse, SourceKind, SourceOutput, SourceStatus } from "../types";
import { loadCanvas } from "./canvas";
import { loadCoursePage } from "./coursePage";
import { isAbortError, SourceError } from "./errors";

/** One configured source. Every module returns the shared SourceOutput shape. */
interface SourceDefinition {
  id: string;
  name: string;
  kind: SourceKind;
  load: (signal: AbortSignal) => Promise<SourceOutput>;
}

function failed(id: string, name: string, kind: SourceKind, error: string): SourceStatus {
  return { id, name, kind, ok: false, error, warnings: [], itemCount: 0 };
}

function buildSources(timeZone: string): { sources: SourceDefinition[]; configErrors: SourceStatus[] } {
  const sources: SourceDefinition[] = [];
  const configErrors: SourceStatus[] = [];

  try {
    const canvas = getCanvasConfig();
    if (canvas) {
      sources.push({ id: "canvas", name: "Canvas", kind: "canvas", load: (s) => loadCanvas(canvas, s) });
    }
  } catch (err) {
    configErrors.push(failed("canvas", "Canvas", "canvas", (err as Error).message));
  }

  const { pages, errors } = getCoursePageConfigs();
  errors.forEach((msg, i) => configErrors.push(failed(`course-pages-config-${i}`, "Course pages", "course-page", msg)));
  pages.forEach((page, i) => {
    sources.push({
      id: `page-${i}`,
      name: page.label,
      kind: "course-page",
      load: (s) => loadCoursePage(page, timeZone, s),
    });
  });

  return { sources, configErrors };
}

/** Runs one source with its own timeout and error boundary; never throws. */
async function runSource(
  def: SourceDefinition,
  timeoutMs: number,
): Promise<{ status: SourceStatus; items: CourseworkItem[] }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new SourceError(`Timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);
  });

  try {
    const out = await Promise.race([def.load(controller.signal), timeout]);
    return {
      status: { id: def.id, name: def.name, kind: def.kind, ok: true, error: null, warnings: out.warnings, itemCount: out.items.length },
      items: out.items,
    };
  } catch (err) {
    let message: string;
    if (err instanceof SourceError) message = err.message;
    else if (isAbortError(err)) message = `Timed out after ${Math.round(timeoutMs / 1000)} seconds.`;
    else {
      console.error(`Source ${def.id} failed`, err);
      message = "Something unexpected went wrong while loading it.";
    }
    return { status: failed(def.id, def.name, def.kind, message), items: [] };
  } finally {
    clearTimeout(timer);
  }
}

export async function loadAllCoursework(): Promise<CourseworkResponse> {
  const timeZone = getTimeZone();
  const timeoutMs = getSourceTimeoutMs();
  const { sources, configErrors } = buildSources(timeZone);

  const results = await Promise.all(sources.map((s) => runSource(s, timeoutMs)));

  return {
    generatedAt: new Date().toISOString(),
    timeZone,
    sources: [...configErrors, ...results.map((r) => r.status)],
    items: results.flatMap((r) => r.items),
  };
}
