# Prompt Log — Classwork Organizer + Third-Party Integration

> Claude Code assembled this log from my conversation history with it and with ChatGPT. Every prompt is copied word for word from what I typed, typos and filler words included.

## Tools used, and for which job

- **Claude Code (Anthropic, Claude Opus 5.5 model)**, in the Claude desktop app. Used for almost all of the building: planning the architecture, writing the Next.js/TypeScript code, testing it against mock Canvas data in its built-in browser, debugging, and deploying to GitHub Pages through GitHub Actions. I picked it because it works directly in my project folder and can run, test, and push code itself, instead of me copying snippets out of a chat window.
- **ChatGPT (OpenAI), with image generation**. Used for UI design. Describing a calendar layout to Claude Code in words didn't get me what I wanted, so I switched to ChatGPT to iterate on *pictures* of the UI until one looked right. ChatGPT then wrote the detailed redesign prompt (Prompt 5) for me to hand to Claude Code along with the mockup. An image model is a better tool for "what should this look like" questions, and a coding agent is better at turning a precise spec into working code.

## Timeline

- **Sun Oct 4:** first landing page and GitHub repo (Phase 1).
- **Wed Oct 7, morning:** Next.js rebuild with Canvas and course-page sources; mockup iteration in ChatGPT and the calendar redesign; GitHub Pages deployment (Phases 2–4).
- **Wed Oct 7, evening:** connecting my real Canvas account, README, UI cleanup iterations, and this log (Phases 4–6).

**[TODO: you]** Total time: about __ hours.

## Development process

### Phase 1 — First page and repo

**Prompt 1**
```
i want to create a classwork organizer. for now, just create a new page a repo on github that includes the titel "Classwork organizer + third party integration", which will connect to canvas and third party website that the user will prompt, so have a user prompt button somewhere as well.
```
Claude Code built a static HTML/CSS/JS page with the title, a placeholder "Connect Canvas" button, and an "Add a website" button that asks for a name and URL. It created the public repo `classwork-organizer-integration`. My account already had a repo called `classwork-organizer`, so it picked a new name instead of overwriting that one. It also turned on GitHub Pages.

**Prompt 2**
```
give the link so i can see this in browser
```

### Phase 2 — Real app: Canvas + course websites

**Prompt 3** (the main spec)
```
Build a web app called **Coursework Tracker** (rename as you like) that shows my upcoming
assignments and tests in one place, fetched live from a configurable set of sources every time
the page loads. Deploy it to Vercel.

## Core idea
Aggregate coursework from two kinds of sources, both configured by whoever runs the app — do NOT
hardcode any credentials or course URLs:
1. A Canvas LMS account, via the Canvas REST API, using a personal access token. The Canvas base
   URL and token are supplied through environment variables (e.g. CANVAS_BASE_URL,
   CANVAS_API_TOKEN).
2. One or more course schedule web pages, whose URLs the user provides through configuration
   (e.g. a COURSE_PAGES environment variable holding a JSON list of { "label": "...",
   "url": "..." }). The app scrapes each page live.

Everything is fetched on demand at page load — no database, no caching, no scheduled/background
jobs.

## Data fetching
- Canvas: fetch assignments across the user's active courses. Classify an item as a TEST when its
  `submission_types` includes "online_quiz" (or it is otherwise quiz-backed), else an ASSIGNMENT.
  Pull course name, due date, points possible, a link back to the item, and submission status
  (submitted / missing / graded) when the API exposes it.
- Course pages: fetch each configured URL's live HTML and parse out assignments and tests. These
  pages vary in structure, so write a generic parser that scans tables and text for date patterns
  and keywords (e.g. "quiz", "exam", "final", "homework", "project", "due") to extract dated
  items, tagging each as test vs assignment by keyword. Make each source its own module with a
  shared output shape so parsers can be added, swapped, or refined per page without touching the
  rest.

## Architecture
- Next.js (App Router) + TypeScript, deployed on Vercel. Use Next.js API routes as the backend —
  no separate server. Parse HTML with cheerio.
- On each page load, the frontend calls the backend, which fetches all configured sources live, in
  parallel, with independent error handling per source and a reasonable per-source timeout. If one
  source fails or its parser breaks, still render the others with a visible inline notice (e.g.
  "Couldn't load [source] right now") — never crash or hang the whole page.
- Shared item shape across all sources: { id, course, title, dueDate (ISO 8601 or null),
  type: "assignment" | "test", points (number|null), url (string|null), status (string|null),
  source }.

## Display
- Top navigation with two views: Assignments and Tests.
- A sort control: by due date (earliest-first and latest-first), by course, and by points.
- A time-window filter, defaulting to "Last 10 days & upcoming", plus "Upcoming only" and
  "All dates".
- In the date-sorted views, a divider marking today's date between past-due and upcoming items.
- Flag overdue items (past due and not already submitted/graded) with a badge and accent.
- Items with no confirmed date go in a separate "Date TBA" section, not the main sorted list.
- Each item shows course name, due date/time, points (if any), status (if any), a source badge,
  and a link back to the source.
- A "Mark done" toggle on each item, persisted in the browser (localStorage).
- Let me add my own assignments/tests (title, course, type, due date) via a form; persist them in
  the browser and let me delete them.
- Optional fun touch: a small counter I can increment to tally how many times the app saved me
  from missing something.
- Consistent timezone handling for parsed and displayed due times.
- Public page — no auth/login gate.

## Config, secrets, and repo
- All credentials and course URLs come from environment variables. Provide a .env.example
  documenting the variable names only (no values). Never hardcode or commit secrets; gitignore
  .env*.local.
- Include a README covering: generating a Canvas access token, setting the env vars, adding
  course-page URLs, running locally (npm install / npm run dev), and deploying to Vercel.

## Deploy
Create a public GitHub repo, push, and deploy to Vercel with the environment variables configured
in the Vercel dashboard.

## Robustness
Scraping arbitrary course pages is inherently fragile — prioritize failing safely with a clear
per-source error over guessing at broken markup. Give each source fetch a timeout so a slow source
can't hang page load.
```
Claude Code rebuilt the repo as a Next.js + TypeScript app. It added a Canvas module that pages through courses and assignments and sends the token only to the Canvas host. It added a generic course-page parser built on cheerio, a parallel source runner where each source has its own timeout and error handling, and the list UI. It tested everything against a local mock server: fake Canvas data, a sample schedule page, a slow page, a 404, and a page that only works with JavaScript. It **could not deploy to Vercel** because the computer wasn't logged in to Vercel, so it gave me manual steps instead.

**Prompt 4**
```
write what i need to do to make the app work
```

### Phase 3 — Calendar-first redesign

I first tried describing the calendar layout I wanted to Claude Code, but it kept producing a list instead of a calendar (see "One place AI got it wrong" below). So I moved the design work to ChatGPT.

**ChatGPT prompt A** (sent with a screenshot of the app's list UI at the time)
```
make a modern, non-block ui mockup. send an image
```
ChatGPT generated a dark-themed mockup, but it was still a list of assignment rows with colored tags.

**ChatGPT prompt B**
```
change the colors. dont use blocks. make it a calednar ui, that has the assignments in the day of the calednar that can be viewed daily, monthly, or weekly. first give an image mockup, then give me the prompt i should tell claude code to get this output
```
This produced the mockup I used: a light, sage-green week-view calendar with pastel assignment blocks, a left sidebar, and a right panel with the selected day and upcoming assignments.

**ChatGPT prompt C**
```
give me the prompt i should tell claude code to get this output
```
ChatGPT wrote the long redesign prompt below. It also recommended adding two closing lines telling Claude Code to reuse the existing data and not fall back to the card layout, because otherwise Claude Code might make something that "looks like the reference at the top but still keeps the old card/list architecture underneath." I included those lines.

**Prompt 5** (sent to Claude Code with the ChatGPT mockup attached; the text is ChatGPT's prompt from prompt C, plus my last line)
```
Redesign my existing Classwork Organizer UI to match the attached reference image.
The goal is to completely move away from the current "list of assignment cards" / dashboard-block design and make the calendar the central experience.
IMPORTANT DESIGN DIRECTION:

* Do NOT use the current stacked assignment-card UI.
* Do NOT make the page feel like a dashboard made of separate rectangular blocks.
* The calendar should be the dominant visual element and occupy most of the screen.
* Assignments should live directly inside the calendar on their corresponding dates.
* Use a clean, modern, minimal productivity-app aesthetic.
* Use the attached reference image as the visual inspiration.

COLOR / VISUAL STYLE:

* Replace the existing dark blue/purple color scheme.
* Use a light, warm, neutral background.
* Use subtle off-white/cream surfaces rather than stark white everywhere.
* Use muted sage green as the primary accent.
* Use soft pastel colors for assignments: lavender, pale blue, soft yellow, pale green, and soft pink.
* Keep colors desaturated and sophisticated rather than bright/saturated.
* Use dark teal/charcoal text.
* Very subtle borders and shadows.
* Avoid heavy gradients, glowing effects, neon colors, and excessive rounded cards.
* Overall feel should be similar to a polished modern calendar/productivity app.

LAYOUT:

1. LEFT SIDEBAR
Create a slim, clean navigation sidebar.

Include:

* Classwork Organizer logo/name
* Calendar
* Assignments
* Tests
* Settings

Calendar should be the active navigation item.
The sidebar should feel integrated into the page rather than looking like a large standalone panel.

2. TOP BAR
At the top of the main content area include:

* Search bar: "Search assignments, classes, or topics..."
* User/profile control on the right

Below the search area, have the calendar controls:

* Current month/year
* Previous month button
* Next month button
* Today button
* View selector:
Day | Week | Month

The view selector should actually change the calendar view.

3. MAIN CALENDAR

The calendar is the PRIMARY UI.
Implement three functional views:
MONTH VIEW:

* Standard monthly calendar grid.
* Sunday through Saturday columns.
* Each date is a clean calendar cell.
* Assignments appear directly inside their date.
* Do NOT put assignments in separate cards outside the calendar.
* Each assignment should be a compact event/chip within its date.
* Show assignment title and, where useful, due time.
* Multiple assignments on the same day should stack naturally.
* Highlight today's date subtly.
* Highlight the selected date with a subtle sage-green treatment.

WEEK VIEW:

* Seven columns, one for each day.
* Time-based vertical calendar similar to Google Calendar.
* Show hours along the left.
* Assignments appear at their appropriate time.
* Assignment blocks should be compact and pastel.
* The current day should be subtly highlighted.

DAY VIEW:

* Large schedule for one selected day.
* Show the date prominently.
* Time runs vertically.
* Assignments appear at their appropriate times.
* Include a small summary of the day's assignments.

4. ASSIGNMENT EVENTS

Assignments should visually look like calendar events, NOT dashboard cards.
For example:
"Norton Illumina
Ebook Chapter 8
11:59 PM"
or
"HW 4
8:00 PM"
Use a small colored indicator or left border to distinguish courses.
Example course colors:

* 15-113 → blue
* 15-121 → purple
* Social Psychology → lavender/pink
* Arabic → yellow
* Language Diversity → green

Completed assignments should appear slightly muted, with a subtle checkmark and/or strikethrough.
Do not make every event a large rounded rectangle. Keep them compact and integrated into the calendar grid.

5. RIGHT SIDE PANEL

In WEEK and DAY views, you can have a narrow contextual sidebar showing:
Selected date
Today's assignments
Upcoming assignments
Small progress information
However, this sidebar should be secondary to the calendar.
In MONTH view, prioritize giving the calendar as much horizontal space as possible.

6. INTERACTIONS

Make the calendar actually functional.
Users should be able to:

* Switch Day / Week / Month
* Navigate previous/next dates
* Click Today
* Click a date
* Click an assignment
* Mark an assignment complete
* See assignment details
* Add an assignment
* Filter by course
* Search assignments

Clicking an assignment should open a lightweight detail popover/modal rather than navigating to a completely separate page.

7. ADD ASSIGNMENT

Create a clean "+ Add" button.
When clicked, show a simple form with:

* Assignment name
* Course
* Due date
* Due time
* Description
* Type
* Completed status

Keep this form minimal and consistent with the calendar aesthetic.

8. RESPONSIVE DESIGN

Desktop should be the primary experience.
On smaller screens:

* Collapse the sidebar.
* Make the calendar horizontally scrollable where appropriate.
* Preserve the calendar-first design.
* Do not simply stack everything into a long list.

TYPOGRAPHY:
Use a modern sans-serif font such as Inter, Geist, or SF Pro-style typography.
Use:

* Large but restrained calendar headings
* Medium-weight assignment titles
* Small muted metadata
* Generous whitespace

BORDERS / SHAPES:

* Very thin borders
* Small corner radii
* Minimal shadows
* Avoid huge rounded containers
* Avoid "card on top of card" design
* Avoid excessive pill-shaped UI

The result should feel like a sophisticated academic calendar rather than a generic SaaS dashboard.
REFERENCE:
Use the attached reference image as the visual direction. Preserve the underlying functionality/data of my existing Classwork Organizer, but redesign the interface substantially around this calendar-first concept.
Most importantly:
THE CALENDAR IS THE PRODUCT.
Assignments should visually exist INSIDE THE CALENDAR rather than being presented as a separate list of cards.
Before coding, inspect the existing application and reuse its existing assignment data, course data, and functionality. Do not create a separate mockup or replace working functionality with static placeholder data. Modify the existing UI/components to implement this design.
Do not use the old stacked-card assignment layout anywhere in the primary calendar experience.

remove all references to pickleball
```
I sent this prompt twice (I interrupted the first send). The last line was mine: the mockup had a pickleball illustration in the sidebar, and I didn't want it in the app. Claude Code rebuilt the frontend: Day/Week/Month views, pastel events colored by course, search, a course filter, an event detail popup, an "add assignment" form, and a right-hand panel. It kept the backend and all the existing data. It tested every interaction against mock data shaped like my real courses.

### Phase 4 — Getting it deployed and working

**Prompt 6**
```
can you deploy it on github pages
```
Claude Code explained that GitHub Pages only hosts static files, so it can't run the backend that keeps my Canvas token secret, and asked me to choose an approach. **I chose "Scheduled refresh".** A GitHub Actions workflow fetches Canvas on GitHub's servers every hour using the token stored as a repository secret, then rebuilds the site. This went against my original "live on every page load" rule, but it was the only way to get real data on Pages. Claude Code tested the static build locally under the same URL path GitHub Pages uses, then switched the repo's Pages source to Actions.

**Prompt 7** (sent with a screenshot of GitHub's "New secret" form)
```
do i add it here
```
I added the `CANVAS_API_TOKEN` secret and the `CANVAS_BASE_URL` variable myself on GitHub. Claude Code never saw the token.

**Prompt 8**
```
where is deploy to github pages
```

### Phase 5 — README

**Prompt 9**
```
i need to include a readme, here are the directions. README.md - must be named `README.md` and located at the repository root (or inside the project folder if you placed the project in your portfolio repo). The README should explain: what the project does, how to use it, which features you are most proud of, how to run it locally, and how secrets (if any) are handled. (Note that even if you deploy in github pages, this should be a new README for just this project.) Write this yourself, in your own words, and make sure it actually covers the items listed above. It must also briefly summarize how you used AI on this project, along with any citations that are relevant (for example, a model or tool that produced a substantial portion of the code, or an outside source you adapted). We are placing more weight on this than we did on earlier assignments. If you want to include AI-generated documentation as well, that is fine, but put it at the bottom of the README under a heading that clearly labels it as AI-generated.

here is what i want it to say, in my own words (but polish it so there are no uh's, um's, and sounds like a coherent paragraph): The project connects to a student's Canvas, in this case, my Canvas, and also uh, connects to uh, other third-party websites uh, because many CS courses have their websites on external, like externally non-Canvas. So it connects to those as well, and it pulls the assignment due date from each assignment in Canvas and in the external website. And uh, in terms of UI, there's uh, different views. There's a calendar view. There's a separate assignment view where you can view each assignment individually. Now you can also view tests individually and settings. Uh, how you use it is, uh, well, in this case, uh, my API is already hard-coded. Um, however, you can add additional websites if you want. And uh, you toggle between different like viewing settings and just viewer assignments. Uh, you can click on them to open them in a new tab in Canvas. So that's how you use it. And then you would use it to look at your assignments every day to uh, ensure you finish them on time. Uh, the feature that I'm most proud of is the calendar UI, because I think it's very clean. Initially, I just had the assignments uh, UI, so just a list. Oh, assignments also has uh, up to 10 days before uh, today's date, so you'll be able to see past assignments that are recent. However, the calendar is very uh, clean, and um, you're able to link directly to course websites or Canvas websites based on what to do. Uh, how to run it locally, you just open it via GitHub and secrets are handled uh, on GitHub. It's uh, in an environment. I put the token in there. Uh, how I use AI on the project. So uh, I did all ideation myself. Um, I use AI to build the basic, uh, the basic features, and then I use ChatGPT image generator to uh, find a mockup and submit that mockup to Claude Code, which then built it out completely. So ideation I did myself, but the building and the UI design was was AI. Uh, then I made iterations myself and AI executed them.

add other details that are supposed to go on the readme as well
```
I dictated the README content myself. Claude Code cleaned it up, added proper local-run steps and citations, and moved its own technical docs to the bottom under an "AI-generated" heading. It also flagged that my phrase "my API is already hard-coded" was inaccurate (the token is a GitHub secret, not in the code) and corrected the wording.

### Phase 6 — My design iterations (simplifying the UI)

After using the app, I decided which parts were clutter and had them removed one at a time:

**Prompt 10**
```
Remove the profile icon in the top right. That is not necessary.
```
**Prompt 11**
```
Add an add external website button that allows the user to add an additional course to be integrated within the app.
```
Claude Code explained the tradeoff: on a static site, the browser can't read most other websites directly. It offered two approaches, either committing the site to the repo or a browser-only version that would fail for many university pages. **I decided not to build this feature**, because neither option was worth its downsides. Course sites can still be added through the `COURSE_PAGES` variable.

**Prompt 12**
```
Remove the save me counter.
```
**Prompt 13**
```
remove the small steps big progress in the bottom left
```
**Prompt 14**
```
Remove the Clear Browser Data feature.
```
**Prompt 15**
```
Remove the sources feature or info.
```
Claude Code removed the Sources panel from Settings. It kept the red "Couldn't load … right now" alert, because otherwise there would be no sign that Canvas failed, and it updated the README sentence that described Settings.

**Prompt 16**
```
have i done all these
```
(I pasted the full Project 2 requirements.) Claude Code checked the live site, repo, git history for secrets, and my portfolio, and listed what was still missing: this prompt log, my own code edits, and a portfolio link.

## Code I wrote or changed myself

Work I did directly, outside of prompting:

- **Design direction:** iterated on mockups in ChatGPT until I found a calendar layout I liked, and chose it as the reference for the redesign.
- **Secrets and configuration:** generated my Canvas access token and added it on GitHub as the `CANVAS_API_TOKEN` repository secret, and added the `CANVAS_BASE_URL` variable. The token never went through the AI.
- **Product decisions:** chose the hourly-refresh GitHub Pages setup; cut the "add external website" feature; decided which UI elements were clutter (profile menu, saved-me counter, tagline, browser-data and sources sections) and removed them.
- **README content:** dictated the README's main sections myself.

**[TODO: you]** Code edits I made by hand (file, what changed, why):
- 

## One place AI got it wrong

Claude Code got the UI wrong at first. I tried to describe the UI I wanted, especially the calendar format, to Claude Code, and it didn't produce what I wanted: it still gave me a list of assignments, not a calendar. So I went to ChatGPT, asked it for a specific mockup, and iterated on it until I found one I liked (ChatGPT prompts A–C above). Then I gave Claude Code a screenshot of that mockup together with the detailed prompt, and that produced the calendar UI the app has now. The lesson for me: when the problem is visual, show the AI a picture of the target instead of describing it in words.

A smaller example: when I asked to deploy on GitHub Pages, Claude Code wrote a script to fetch my Canvas data during the GitHub Actions build. The first time it ran, the script crashed, because it used `await` at the top level of the file, which the tool running it (tsx) doesn't support in this project's setup. Claude Code caught this only because it ran the build steps locally before pushing, and it fixed the script by wrapping the code in an `async main()` function. Its original plan to deploy on Vercel also didn't work, since it couldn't log in to Vercel there, so the deployment had to be redesigned for GitHub Pages.
