import { NextResponse } from "next/server";
import { loadAllCoursework } from "@/lib/sources";

// Always fetch live: no static rendering, no caching.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const data = await loadAllCoursework();
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
