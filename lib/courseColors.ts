export interface CourseColor {
  name: string;
  /** Soft fill for event backgrounds. */
  bg: string;
  /** Stronger tone for the left rule and dots. */
  accent: string;
  /** Readable text on `bg`. */
  ink: string;
}

// Desaturated pastels; each pairs a soft fill with a mid-tone accent.
export const PALETTE: Record<string, CourseColor> = {
  blue: { name: "blue", bg: "#e4ecf4", accent: "#7c9fc2", ink: "#2c4660" },
  purple: { name: "purple", bg: "#ebe6f3", accent: "#9a8ac0", ink: "#463a63" },
  pink: { name: "pink", bg: "#f5e6ea", accent: "#c9919f", ink: "#663845" },
  yellow: { name: "yellow", bg: "#f6efd9", accent: "#cdb06a", ink: "#5c4a1c" },
  green: { name: "green", bg: "#e3eee5", accent: "#86ad91", ink: "#2f4e38" },
  peach: { name: "peach", bg: "#f5e8de", accent: "#cf9f80", ink: "#5f3e28" },
  teal: { name: "teal", bg: "#e0eeec", accent: "#76aaa4", ink: "#2b4c49" },
  lavender: { name: "lavender", bg: "#eeeaf6", accent: "#a99ccf", ink: "#4a4166" },
};

const ORDER = ["blue", "purple", "green", "yellow", "pink", "teal", "peach", "lavender"];

// Known courses get fixed colors; everything else is assigned in order.
const OVERRIDES: [RegExp, string][] = [
  [/15[-\s]?113/i, "blue"],
  [/15[-\s]?121/i, "purple"],
  [/social\s+psych/i, "pink"],
  [/arabic/i, "yellow"],
  [/language\s+divers/i, "green"],
];

/** Assigns every course a stable color: overrides first, then unused palette colors in name order. */
export function buildCourseColors(courses: string[]): Map<string, CourseColor> {
  const map = new Map<string, CourseColor>();
  const used = new Set<string>();
  const unique = [...new Set(courses)].sort((a, b) => a.localeCompare(b));

  for (const course of unique) {
    const hit = OVERRIDES.find(([re]) => re.test(course));
    if (hit) {
      map.set(course, PALETTE[hit[1]]);
      used.add(hit[1]);
    }
  }
  let i = 0;
  for (const course of unique) {
    if (map.has(course)) continue;
    const free = ORDER.filter((c) => !used.has(c));
    const pick = free.length ? free[0] : ORDER[i++ % ORDER.length];
    used.add(pick);
    map.set(course, PALETTE[pick]);
  }
  return map;
}
