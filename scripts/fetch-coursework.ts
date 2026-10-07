// Fetches every configured source once and writes the result to public/coursework.json.
// Used by the GitHub Pages workflow, where there is no server to call the sources live.
import { mkdirSync, writeFileSync } from "node:fs";
import { loadAllCoursework } from "../lib/sources";

const OUT = "public/coursework.json";

async function main() {
  const data = await loadAllCoursework();
  mkdirSync("public", { recursive: true });
  writeFileSync(OUT, JSON.stringify(data));

  console.log(`Wrote ${data.items.length} items to ${OUT}`);
  for (const s of data.sources) {
    console.log(`  ${s.ok ? "ok  " : "FAIL"} ${s.name}${s.ok ? ` (${s.itemCount})` : `: ${s.error}`}`);
  }
}

main();
