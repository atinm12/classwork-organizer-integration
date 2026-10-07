import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import type { ItemType } from "../../types";
import { findDate } from "./dateText";
import type { PageParser, ParsedEntry } from "./types";

// Lines longer than this are prose (policies, descriptions), not schedule entries.
const MAX_LINE_LENGTH = 240;
const MAX_ITEMS = 300;

const TEST_WORDS = /\b(quiz(?:zes)?|exams?|midterms?|tests?)\b/i;
const FINAL_WORD = /\bfinals?\b/i;
const ASSIGNMENT_NOUNS =
  /\b(homeworks?|hw\s?#?\d*|assignments?|projects?|labs?|problem sets?|psets?|essays?|papers?|reports?|presentations?|worksheets?)\b/i;
const DUE_WORD = /\bdue\b/i;
const NOISE = /\b(solutions?|review session|(?:exam|midterm|final|quiz) review|review for|office hours|grades? (?:are )?(?:posted|released)|regrade)\b/i;
const TBA = /\b(tba|tbd|to be (?:announced|determined))\b/i;

/** Tags a line as a test or assignment by keyword, or null if it's neither. */
export function classifyText(text: string): ItemType | null {
  if (NOISE.test(text)) return null;
  const hasAssignmentNoun = ASSIGNMENT_NOUNS.test(text);
  if (TEST_WORDS.test(text)) return "test";
  if (FINAL_WORD.test(text) && !hasAssignmentNoun) return "test";
  if (hasAssignmentNoun || DUE_WORD.test(text)) return "assignment";
  return null;
}

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function makeTitle(text: string, strip: string[]): string {
  let t = text;
  for (const s of strip) t = t.replace(s, " ");
  t = clean(t)
    .replace(/^(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*\.?,?\s+/i, "")
    .replace(/^[\s\-–—:|,·•()]+|[\s\-–—:|,·•(]+$/g, "")
    .replace(/\(\s*\)/g, "")
    // Drop connector words left dangling once the date is removed ("Final exam: at").
    .replace(/(?:[\s,:\-–—]+(?:at|by|on|@))+[\s,:\-–—]*$/i, "")
    .replace(/^(?:(?:at|by|on|@)[\s,:\-–—]+)+/i, "")
    .trim();
  return t.length > 140 ? `${t.slice(0, 137)}…` : t;
}

/** Splits an element's text into lines, treating <br> and nested blocks as breaks. */
function linesOf($: cheerio.CheerioAPI, el: AnyNode): string[] {
  return $(el)
    .text()
    .split(/\n|;/)
    .map(clean)
    .filter(Boolean);
}

function firstLink($: cheerio.CheerioAPI, el: AnyNode, pageUrl: string): string | null {
  const href = $(el).find("a[href]").first().attr("href");
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) return null;
  try {
    return new URL(href, pageUrl).toString();
  } catch {
    return null;
  }
}

const BLOCKS = "p, li, h1, h2, h3, h4, h5, h6, dt, dd, div, section, article, blockquote, pre";

/**
 * Generic schedule parser: scans tables row by row, then the remaining text blocks line by line,
 * keeping only lines that have both a recognizable date and a coursework keyword.
 */
export const genericParser: PageParser = (html, ctx) => {
  const $ = cheerio.load(html);
  $("script, style, noscript, template, svg, iframe").remove();
  $("br").replaceWith("\n");
  // Make nested block boundaries show up as line breaks in .text().
  $(BLOCKS).each((_, el) => {
    $(el).prepend("\n").append("\n");
  });
  $("td, th").append("\n");

  const entries: ParsedEntry[] = [];

  const consider = (text: string, rowDateText: string | null, link: string | null) => {
    if (text.length > MAX_LINE_LENGTH) return;
    const type = classifyText(text);
    if (!type) return;
    const own = findDate(text, ctx.now, ctx.timeZone);
    // Borrow the row's date, but let a time written in this line ("Exam, 6 pm") apply to it.
    const inherited = !own && rowDateText ? findDate(`${rowDateText} ${text}`, ctx.now, ctx.timeZone) : null;
    const date = own ?? inherited;
    if (!date && !TBA.test(text)) return;
    const title = makeTitle(text, date ? date.matched : [TBA.exec(text)?.[0] ?? ""]);
    if (title.length < 3) return;
    entries.push({
      title,
      type,
      dueDate: date?.iso ?? null,
      dateOnly: date?.dateOnly ?? false,
      url: link,
    });
  };

  // 1. Tables: a date anywhere in the row applies to keyword cells that lack their own date.
  $("table tr").each((_, row) => {
    const cells = $(row).children("td, th").toArray();
    if (cells.length === 0) return;
    const cellLines = cells.map((c) => linesOf($, c));
    const dateCell = cellLines.flat().find((line) => findDate(line, ctx.now, ctx.timeZone));
    cells.forEach((cell, i) => {
      const link = firstLink($, cell, ctx.pageUrl);
      for (const line of cellLines[i]) consider(line, dateCell ?? null, link);
    });
  });
  $("table").remove();

  // 2. Leaf text blocks (blocks with no nested blocks), line by line.
  $(BLOCKS)
    .filter((_, el) => $(el).find(BLOCKS).length === 0)
    .each((_, el) => {
      const link = firstLink($, el as Element, ctx.pageUrl);
      for (const line of linesOf($, el)) consider(line, null, link);
    });

  // 3. Whole-page text, to catch lines sitting between blocks. Duplicates of earlier
  // matches are dropped by the caller, so entries found with a link above win.
  for (const line of $("body").text().split("\n").map(clean).filter(Boolean)) {
    consider(line, null, null);
  }

  const warnings: string[] = [];
  if (entries.length > MAX_ITEMS) {
    warnings.push(`Found an unusually large number of items; showing the first ${MAX_ITEMS}.`);
    entries.length = MAX_ITEMS;
  }
  return { entries, warnings };
};
