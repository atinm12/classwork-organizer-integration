# Classwork Organizer + Third-Party Integration

**Live site:** https://atinm12.github.io/classwork-organizer-integration/

## What the project does

Classwork Organizer connects to a student's Canvas account (in this case, mine) and also to third-party course websites. Many CS courses host their schedules on their own websites instead of on Canvas, so the app reads those pages too. It pulls the due date of every assignment from Canvas and from each external site and puts everything in one place.

The app has several views. The **Calendar** view shows assignments on their due dates, with Day, Week, and Month layouts. The **Assignments** view lists each assignment individually, the **Tests** view does the same for tests, and the **Settings** view shows which sources loaded and lets you adjust a few options.

## How to use it

My Canvas account is already connected, so the site shows my coursework as soon as it opens. The Canvas token is stored as a GitHub secret, not in the code (see "How secrets are handled" below). You can also add more course websites, and you can add your own assignments with the **+ Add** button.

To use the app, switch between the Calendar, Assignments, and Tests views, and between Day, Week, and Month on the calendar. Click any assignment to see its details, then use the link to open it in Canvas or on the course website in a new tab. You can also mark an assignment complete, search for assignments, and filter by course.

The idea is to check it every day so you finish your assignments on time.

## Features I'm most proud of

The feature I'm most proud of is the **calendar UI**, because it's very clean. At first the app only had the assignments list. The list still exists, and by default it also shows assignments from up to 10 days before today, so you can see recent past assignments you might have missed. The calendar, though, is much cleaner. Every course has its own color, completed work is crossed out, and overdue work is flagged. Each assignment links straight to its Canvas page or course website, depending on where it came from.

## How to run it

The easiest way is to open the live site on GitHub Pages: https://atinm12.github.io/classwork-organizer-integration/. The data refreshes automatically about once an hour.

To run it on your own computer:

1. Install [Node.js](https://nodejs.org/) (version 20 or newer).
2. Clone this repository and open the folder in a terminal.
3. Run `npm install`.
4. Copy `.env.example` to a new file named `.env.local`, and fill in your Canvas URL, your Canvas access token, and optionally your course website URLs.
5. Run `npm run dev` and open http://localhost:3000.

## How secrets are handled

The only secret is my Canvas access token. It is **never written into the code or committed to the repository.**

- **On GitHub:** the token is saved as a repository secret, under Settings → Secrets and variables → Actions. A GitHub Actions workflow uses it on GitHub's servers to fetch my assignments and publish the site. The token never reaches the browser, and GitHub hides it, including in the workflow logs.
- **Locally:** the token goes in `.env.local`, which is listed in `.gitignore` so it can't be committed by accident. `.env.example` only lists the variable names, with no values.

One thing to note: the assignment list itself (titles and due dates) is visible to anyone who has the site link.

## How I used AI

I did all of the ideation myself: what the app should do, which sources it should connect to, and what features it needed. I used AI to build the basic features. For the design, I used ChatGPT's image generator to create a mockup of the calendar interface, gave that mockup to Claude Code, and Claude Code built the full UI from it. So the ideas were mine, while most of the building and the UI design were done by AI. After that, I decided on the changes I wanted in each iteration, and the AI implemented them.

### Citations

- **Claude Code** (Anthropic), using the **Claude Opus 5.5** model. It wrote most of the code in this repository: the Canvas and course-website integration, the calendar and list interfaces, and the GitHub Pages deployment workflow. It also wrote the AI-generated documentation section below.
- **ChatGPT image generation** (OpenAI) produced the UI mockup used as the visual reference for the calendar design.
- **Canvas LMS REST API** (Instructure): the app reads courses and assignments through this API.
- Open-source tools the app is built on: **Next.js** and **React** (web framework), **cheerio** (reads course website HTML), the **Inter** typeface (via Google Fonts), and **GitHub Actions / GitHub Pages** (hosting).

---

## AI-generated documentation

*Everything below this line was written by Claude Code (Claude Opus 5.5), not by me. It is technical reference for configuring and deploying the project.*

### Overview

Classwork Organizer is a Next.js (App Router) + TypeScript app. Coursework comes from two kinds of sources, both configured with environment variables:

1. **Canvas**, via the Canvas REST API with a personal access token. Quiz-backed assignments are classified as tests.
2. **Course schedule pages**, which are fetched and scanned for lines that contain both a date and a keyword such as quiz, exam, homework, project, lab, or due.

Each source runs in parallel with its own timeout. If one fails, the others still load, and the app shows an inline notice explaining which source failed and why.

### Configuration

See [`.env.example`](.env.example).

| Variable | Required | Description |
| --- | --- | --- |
| `CANVAS_BASE_URL` | for Canvas | Your school's Canvas URL, e.g. `https://canvas.cmu.edu` |
| `CANVAS_API_TOKEN` | for Canvas | A Canvas personal access token (see below) |
| `COURSE_PAGES` | optional | JSON array of course schedule pages to read (see below) |
| `APP_TIMEZONE` | recommended | IANA timezone such as `America/New_York`. Used to read dates on course pages and to display due times. Defaults to `UTC`. |
| `SOURCE_TIMEOUT_MS` | optional | Per-source timeout in milliseconds, default `10000` |

#### Generating a Canvas access token

1. Log in to Canvas and open **Account → Settings**.
2. Under **Approved Integrations**, click **+ New Access Token**.
3. Give it a purpose and an expiry date, then click **Generate Token**.
4. Copy the token right away, because Canvas only shows it once.

#### Adding course pages

`COURSE_PAGES` is a JSON array. Each entry needs a `label` and a `url`:

```json
[
  { "label": "15-113 site", "url": "https://example.edu/15113/schedule.html", "course": "15-113" },
  { "label": "Chem lab schedule", "url": "https://example.edu/chem/labs" }
]
```

- `course` (optional) is the course name shown on each item. Match the name Canvas uses so both sources share a color. It defaults to `label`.
- `parser` (optional) picks a parser from `PAGE_PARSERS` in `lib/sources/coursePage/index.ts`. It defaults to `generic`.

The generic parser handles dates like `Oct 12`, `10/12`, and `2026-10-12`, with optional times. In a table row, a date in one cell applies to items in the other cells. Dates without a year use the year closest to today, and dates without a time are treated as due at 11:59 PM. Pages that need a login, or that build their content with JavaScript, can't be read; the app shows a notice for those instead of guessing.

### Deploying to GitHub Pages (current setup)

GitHub Pages only serves static files, so it can't run the app's API route. Instead, [`.github/workflows/pages.yml`](.github/workflows/pages.yml) fetches Canvas and the course pages inside GitHub Actions and saves the result as `coursework.json`. It then builds a static copy of the site and publishes it. This runs on every push to `main` and once an hour, so the data can be up to about an hour old.

Setup, under **Settings → Secrets and variables → Actions**:

1. **Secrets** tab: add `CANVAS_API_TOKEN`.
2. **Variables** tab: add `CANVAS_BASE_URL`, `APP_TIMEZONE`, and optionally `COURSE_PAGES`.
3. **Actions** tab → **Deploy to GitHub Pages** → **Run workflow** to publish right away.

GitHub pauses scheduled workflows in repositories with no activity for 60 days. If the data stops updating, re-enable the workflow on the Actions tab.

### Deploying to Vercel (alternative, live data)

On Vercel, the API route runs on every page load, so the data is always live. Import the repository at https://vercel.com/new, add the same environment variables under **Settings → Environment Variables**, and deploy. To keep the page private, turn on **Deployment Protection**.

### Project layout

```
app/api/coursework/route.ts         live API: runs every source in parallel
lib/sources/index.ts                source registry, per-source timeout and error isolation
lib/sources/canvas.ts               Canvas REST API source
lib/sources/coursePage/             course page source, generic parser, parser registry
lib/types.ts                        shared CourseworkItem shape
lib/dates.ts                        timezone helpers shared by server and browser
lib/calendar.ts                     calendar date math
lib/courseColors.ts                 course color assignment
components/                         UI: Tracker (shell), calendar/ (Month, TimeGrid), panels, dialogs
scripts/fetch-coursework.ts         writes the data snapshot for GitHub Pages
.github/workflows/pages.yml         hourly GitHub Pages build and deploy
```
