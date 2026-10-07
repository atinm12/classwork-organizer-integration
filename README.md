# Classwork Organizer

Upcoming assignments and tests from **Canvas** and your **course schedule pages**, in one place.
Every page load fetches all sources live and in parallel. There is no database, no caching, and no background job.

- **Assignments / Tests** views. Canvas quiz-backed items and pages mentioning quiz/exam/midterm/final count as tests.
- Sort by due date (earliest or latest first), course, or points.
- Time window: *Last 10 days & upcoming* (default), *Upcoming only*, or *All dates*.
- A "Today" divider in date-sorted views, overdue badges, and a separate **Date TBA** section.
- "Mark done" checkboxes, your own custom items, and a "saved me" counter. These are stored in your browser (localStorage).
- If one source fails or is slow, the rest still load and a notice explains what went wrong.

Built with Next.js (App Router) + TypeScript. The API route is `app/api/coursework/route.ts` and HTML is parsed with cheerio.

## Configuration

All configuration comes from environment variables. Nothing is hardcoded. See [`.env.example`](.env.example).

| Variable | Required | Description |
| --- | --- | --- |
| `CANVAS_BASE_URL` | for Canvas | Your school's Canvas URL, e.g. `https://school.instructure.com` |
| `CANVAS_API_TOKEN` | for Canvas | A Canvas personal access token (see below) |
| `COURSE_PAGES` | optional | JSON array of course schedule pages to scrape (see below) |
| `APP_TIMEZONE` | recommended | IANA timezone such as `America/Los_Angeles`. Used to read dates on course pages and to display every due time. Defaults to `UTC`. |
| `SOURCE_TIMEOUT_MS` | optional | Per-source timeout, default `10000` |

### Generating a Canvas access token

1. Log in to Canvas and open **Account → Settings**.
2. Under **Approved Integrations**, click **+ New Access Token**.
3. Give it a purpose (e.g. "Classwork Organizer") and an expiry date, then click **Generate Token**.
4. Copy the token right away, because Canvas only shows it once. Put it in `CANVAS_API_TOKEN`.

The token can read everything your Canvas account can see, so keep it private. Only set it in `.env.local` or in your Vercel project settings, and never commit it. Some schools disable personal tokens; if so, Canvas will show an error and the other sources will still work.

### Adding course pages

`COURSE_PAGES` is a JSON array. Each entry needs a `label` and a `url`:

```json
[
  { "label": "CS 101 site", "url": "https://example.edu/cs101/schedule.html", "course": "CS 101" },
  { "label": "Chem lab schedule", "url": "https://example.edu/chem/labs" }
]
```

- `course` (optional) is the course name shown on each item. It defaults to `label`.
- `parser` (optional) picks a parser from `PAGE_PARSERS` in `lib/sources/coursePage/index.ts`. It defaults to `generic`.

The generic parser scans tables and text for lines that contain **both** a date (e.g. `Oct 12`, `10/12`, `2026-10-12`, optionally with a time) **and** a keyword (`quiz`, `exam`, `midterm`, `final`, `homework`, `HW`, `project`, `lab`, `essay`, `due`, …). In a table row, a date in one cell applies to keyword items in the other cells. Dates without a year use the year closest to today, and dates without a time are treated as due at 11:59 PM.

Limitations: pages that build their content with JavaScript, or that sit behind a login, can't be read. The app shows a notice for those pages instead of guessing. To handle a tricky page, write a parser with the `PageParser` signature in `lib/sources/coursePage/types.ts`, register it in `PAGE_PARSERS`, and set `"parser": "<name>"` on that page.

## Running locally

```bash
npm install
```

```bash
cp .env.example .env.local
```

Fill in `.env.local`, then:

```bash
npm run dev
```

Open http://localhost:3000.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, click **Add New → Project** and import the repo. The Next.js defaults work as-is.
3. Under **Settings → Environment Variables**, add `CANVAS_BASE_URL`, `CANVAS_API_TOKEN`, `COURSE_PAGES`, and `APP_TIMEZONE`.
4. Deploy. If you change environment variables later, redeploy from the **Deployments** tab so the change takes effect.

The page is public and anyone with the URL can see the coursework it shows. Don't share the URL if that matters to you, or turn on Vercel's Deployment Protection.

## Project layout

```
app/api/coursework/route.ts       live API: runs every source in parallel
lib/sources/index.ts              source registry, per-source timeout and error isolation
lib/sources/canvas.ts             Canvas REST API source
lib/sources/coursePage/           course page source, generic parser, parser registry
lib/types.ts                      shared CourseworkItem shape
lib/dates.ts                      timezone helpers shared by server and browser
components/                       UI (Tracker, ItemCard, AddItemForm)
```
