# AttendWise — Refined Build Plan & Agent Prompt

Your original plan was solid. Here's what I changed and why, followed by a copy-paste-ready prompt for Antigravity/Codex.

---

## 1. What I changed

### Tech stack — simplified to one framework
Separate React + Vite frontend and Node/Express backend means two servers, CORS config, and two deploy targets. That's extra surface area for an AI coding agent to get wrong.

**New stack:**
- **Next.js 14 (App Router)** — frontend pages *and* backend API routes in one project, one dev server, one deploy.
- **Tailwind CSS** — unchanged.
- **Prisma ORM + SQLite** (dev) → **Postgres via Supabase/Neon free tier** (production) — Prisma makes that swap a one-line config change, not a rewrite.
- **NextAuth.js** — free, handles email/password or Google login without you building auth from scratch.
- **Chart.js** via `react-chartjs-2` — unchanged.
- **Tesseract.js** — unchanged, runs client-side.
- **Vercel** — free hosting, deploys straight from GitHub, zero server management.

This is also just easier for Antigravity/Codex to scaffold correctly in one pass, since it's a single coherent project rather than two coordinated services.

### The planner algorithm — made precise
"Need to attend 39 of next 45 classes" needs an actual formula, or the AI agent will hand-wave it. Here it is, per subject:

```
Let:
  A = classes attended so far
  T = total classes held so far
  R = classes remaining this semester (from timetable × remaining weeks, minus holidays)
  P = target attendance (e.g. 0.75)

If currently BELOW target:
  minimum classes to attend among the remaining R:
  x = ceil(P * (T + R) - A), clamped to [0, R]
  → "must attend" = x
  → "can skip" = R - x

If currently AT OR ABOVE target:
  maximum classes that can still be skipped while staying ≥ target:
  s = floor(A / P - T), clamped to [0, R]
  → "can skip" = s
  → "must attend" = R - s

If x > R even after attending everything: target is mathematically unreachable.
  Show the best achievable percentage instead: (A + R) / (T + R).
```

This is the actual engine behind "which classes you must attend" — worth giving the agent verbatim so it doesn't invent something looser.

### Database schema — spelled out
Give the agent a concrete schema instead of "database design," so it doesn't guess:

```
User            id, name, email, passwordHash, targetPercent, createdAt
Semester        id, userId, startDate, endDate, country
Subject         id, semesterId, name, colorTag
TimetableSlot   id, subjectId, dayOfWeek, startTime, endTime
Holiday         id, semesterId, date, name, source(auto|manual)
AttendanceLog   id, subjectId, date, status(present|absent|holiday|cancelled)
```

`AttendanceLog` is the one table everything else derives from — attendance %, streaks, charts, and the planner all read from it.

### Scope: cut for MVP, defer the rest
Your feature list is good but too much for one build pass. AI coding agents do much better with a tight v1 and clearly labeled "later" features than with everything at once. I split it below.

### Small additions worth having
- **"What-if" simulator** (already on your list) — promote it into MVP. It's just the planner formula run with hypothetical inputs, so it's nearly free once the planner exists.
- **Empty/error states** — explicit language for "no timetable yet," "OCR couldn't read this image," etc., so the agent designs for them instead of leaving blank screens.
- **Mobile-first** — most students will use this on a phone between classes; say so explicitly or the agent will default to desktop-first.
- **Data ownership** — one line reminding the agent this is student data (grades/attendance adjacent), so it doesn't log attendance data anywhere it shouldn't and keeps auth on all API routes.

---

## 2. Phased build plan

| Phase | Deliverable |
|---|---|
| **0. Scaffold** | Next.js + Tailwind + Prisma + NextAuth wired up, deployed to Vercel with a placeholder page |
| **1. Core data** | Auth, semester setup, manual timetable entry, subject list — CRUD only, no logic yet |
| **2. Attendance engine** | Daily tracker UI, `AttendanceLog` writes, live current-attendance % per subject |
| **3. Planner** | The formula above, dashboard cards (current / target / must-attend / can-skip), what-if simulator |
| **4. Visuals** | Calendar heatmap, Chart.js trend graphs, streaks |
| **5. OCR** | Tesseract.js timetable image upload → parsed schedule → user confirms/edits before saving |
| **6. Polish** | Holiday auto-import (static JSON), PWA manifest, dark mode, CSV/PDF export |

Build and test each phase before moving to the next — don't ask the agent to do all six in one shot.

---

## 3. Ready-to-use prompt for Antigravity / Codex

Paste this in as your first message for **Phase 0 + 1**. Run later phases as separate follow-up prompts once each is working — this keeps each build pass reviewable.

```
Build a web app called AttendWise — an attendance planner for students.

STACK (use exactly this, no substitutions):
- Next.js 14, App Router, TypeScript
- Tailwind CSS
- Prisma ORM with SQLite for local dev
- NextAuth.js for authentication (email/password credentials provider)
- react-chartjs-2 for charts (not needed yet, just install it)

DATABASE SCHEMA (Prisma):
- User: id, name, email, passwordHash, targetPercent (default 75), createdAt
- Semester: id, userId, startDate, endDate, country, workingSaturdays (boolean)
- Subject: id, semesterId, name, colorTag
- TimetableSlot: id, subjectId, dayOfWeek (0-6), startTime, endTime
- Holiday: id, semesterId, date, name, source ("auto" | "manual")
- AttendanceLog: id, subjectId, date, status ("present" | "absent" | "holiday" | "cancelled")

BUILD THIS FIRST (Phase 0 + 1 only — do not build the planner, OCR, or charts yet):
1. Project scaffold with the above stack, Tailwind configured, Prisma migrated.
2. Auth: sign up / log in / log out with NextAuth credentials provider.
3. Onboarding flow: after signup, user sets semester start date, end date,
   country, whether Saturdays count as working days, and target attendance %.
4. Subject management: add/edit/delete subjects.
5. Timetable builder: for each subject, add weekly time slots (day + start + end
   time) via a simple form — no OCR yet, manual entry only.
6. A dashboard page listing the user's subjects and their weekly timetable in
   a clean grid.
7. All data operations go through Next.js API routes, protected by the
   logged-in session — no route should read or write another user's data.

DESIGN DIRECTION:
Mobile-first — students will use this between classes on their phones.
Design a real visual identity for this product, don't default to a generic
dashboard template: pick a deliberate color palette and type pairing that
fits a "student productivity tool" feel, give it one small signature detail
(e.g. how attendance status is shown at a glance), and make sure empty
states (no subjects yet, no timetable yet) have clear, friendly guidance
text rather than a blank screen.

Do not implement the attendance tracker, planner math, OCR upload, or
charts in this pass — stop after the timetable builder and dashboard are
working end to end, so I can review before continuing.
```

**Follow-up prompt for Phase 2 + 3** (send after Phase 0/1 is reviewed and working):

```
Now add the attendance engine and planner to AttendWise, using the existing
schema (AttendanceLog table).

1. Daily tracker: a "Today" view showing each scheduled class for today with
   Present / Absent / Cancelled buttons. Writes to AttendanceLog. Should also
   let the user log/edit attendance for past dates.

2. Attendance calculation: for each subject, compute attended count and total
   held count from AttendanceLog (excluding "holiday" and "cancelled" from
   the denominator).

3. Planner engine — implement this exact formula per subject:

   Let A = attended, T = total held so far, R = remaining scheduled classes
   between today and semester end (from TimetableSlot × remaining calendar
   days, minus Holiday dates), P = target attendance (decimal, e.g. 0.75).

   If A/T < P (below target):
     x = ceil(P * (T + R) - A), clamped to [0, R]
     mustAttend = x, canSkip = R - x
     If x > R: target is unreachable this semester — show best possible
     final percentage instead: (A + R) / (T + R).

   If A/T >= P (at/above target):
     s = floor(A / P - T), clamped to [0, R]
     canSkip = s, mustAttend = R - s

4. Dashboard cards per subject: Current %, Target %, Must Attend, Can Skip.

5. "What-if" simulator: let the user pick a subject and a number of
   hypothetical future absences, and show the resulting projected
   percentage using the same formula.

Keep the same design language established in the previous build. Stop here
so I can review before adding charts, calendar view, and OCR.
```

Keep this document and reuse the later-phase prompts (charts/calendar, OCR, holidays/PWA/export) the same way once Phase 2/3 is confirmed working — I'm happy to help write those next prompts once you're at that point.
```
