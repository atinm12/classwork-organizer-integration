# Classwork Organizer

Upcoming assignments and tests from **Canvas** and your **course schedule pages**, in one place.
Every page load fetches all sources live and in parallel. There is no database, no caching, and no background job.

- **Calendar first.** Day, Week, and Month views show assignments and tests as events on their due dates and times. Each course gets its own pastel color, and items without a time sit in a "Due" row at the top of the day.
- Click any event for details, a link back to its source, and a **Mark complete** toggle. Completed items are muted and struck through, and overdue ones get a small red dot.
- **Search** across titles, courses, and sources (pick a result to jump to it), plus a **course filter**.
- **+ Add** your own assignments (name, course, date, time, description, type, completed). They are saved in your browser.
- **Assignments / Tests** sections list everything in a compact table with sorting (by due date, course, or points), a time window, a "Today" divider, and a **Date TBA** group.
- A "saved me" counter in the sidebar. Completed marks, your own items, and the counter live in localStorage.
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

## Deploying to GitHub Pages

GitHub Pages only serves static files, so it can't run the API route. Instead,
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) fetches Canvas and your course pages
inside GitHub Actions, where the token stays secret. It saves the result as `coursework.json`,
builds a static copy of the site, and publishes it. This runs on every push to `main` and
**once an hour**, so the data can be up to about an hour old (the footer shows when it was last
updated).

Setup, in the repo on GitHub, under **Settings → Secrets and variables → Actions**:

1. **Secrets** tab → **New repository secret**: `CANVAS_API_TOKEN`.
2. **Variables** tab → **New repository variable**: `CANVAS_BASE_URL`, `APP_TIMEZONE`, and optionally `COURSE_PAGES`.
3. **Actions** tab → **Deploy to GitHub Pages** → **Run workflow** to publish right away.

The site is at `https://<your-username>.github.io/<repo-name>/`. Notes:

- The token is never sent to the browser, but the fetched assignment list (`coursework.json`) is
  as public as the page itself.
- GitHub pauses scheduled workflows in repos with no activity for 60 days. If the data stops
  updating, re-enable the workflow on the Actions tab.

## Project layout

```
app/api/coursework/route.ts       live API: runs every source in parallel
lib/sources/index.ts              source registry, per-source timeout and error isolation
lib/sources/canvas.ts             Canvas REST API source
lib/sources/coursePage/           course page source, generic parser, parser registry
lib/types.ts                      shared CourseworkItem shape
lib/dates.ts                      timezone helpers shared by server and browser
components/                       UI: Tracker (shell), calendar/ (Month, TimeGrid), RightPanel, AgendaList, dialogs
lib/calendar.ts, lib/courseColors.ts  calendar math and course colors
scripts/fetch-coursework.ts       writes the data snapshot for GitHub Pages
```
