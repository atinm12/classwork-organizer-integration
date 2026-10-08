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
  blue: { name: "blue", bg: "#e8edf2", accent: "#8fa5bb", ink: "#33475a" },
  purple: { name: "purple", bg: "#ece9f1", accent: "#a39bb8", ink: "#4a4359" },
  pink: { name: "pink", bg: "#f2e9eb", accent: "#bfa0a8", ink: "#5c4248" },
  yellow: { name: "yellow", bg: "#f3efe3", accent: "#c4b183", ink: "#574b2c" },
  green: { name: "green", bg: "#e7eee8", accent: "#97ad9d", ink: "#3a4f40" },
  peach: { name: "peach", bg: "#f2ebe5", accent: "#c4a690", ink: "#584536" },
  teal: { name: "teal", bg: "#e5eeed", accent: "#8eaca8", ink: "#36504d" },
  lavender: { name: "lavender", bg: "#efedf3", accent: "#aba4c4", ink: "#4b465e" },
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
