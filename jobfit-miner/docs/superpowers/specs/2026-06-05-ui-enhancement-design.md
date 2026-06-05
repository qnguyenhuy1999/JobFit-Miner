# UI Enhancement Design — JobFit Miner
**Date:** 2026-06-05  
**Status:** Approved  

---

## Overview

Redesign `app/page.tsx` from a bare-bones single-page form into a polished, branded 4-step wizard. No new dependencies — pure Tailwind CSS v4 with extended brand palette tokens.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Visual direction | Bold & Branded | Orange→pink gradient, warm palette, startup personality |
| Layout | Guided Steps wizard | Clear progression, less overwhelming than single-page dump |
| Job results | Rich cards | Scannable, informative, shows AI reason inline |
| Implementation | Pure Tailwind rewrite | Zero new deps, single file scope, brand tokens in config |

---

## Brand & Color System

Tailwind v4 is CSS-first — no `tailwind.config.ts`. Add brand tokens to the existing `@theme inline` block in `app/globals.css`:

```css
@theme inline {
  --color-brand-orange: #f97316;
  --color-brand-pink:   #ec4899;
  --color-brand-warm:   #fff7ed;
  --color-brand-border: #fed7aa;
  --color-brand-muted:  #9a3412;
}
```

Primary gradient: `linear-gradient(90deg, #f97316, #ec4899)` — used on CTA buttons, score badges, stepper active states, logo.

Score colors:
- ≥70: gradient badge (high)
- 40–69: `#f97316` on `#fff7ed` border badge (mid)  
- <40: `#ef4444` on `#fef2f2` border badge (low)

---

## Wizard Steps

State: `currentStep: 1 | 2 | 3 | 4` (useState)

| Step | Label | What happens |
|---|---|---|
| 1 | Configure | Enter site URL, keywords, profile. "Mine Jobs →" advances to step 2 and triggers mine API call. |
| 2 | Mine | Loading state with animated progress bar and live log lines. Auto-advances to step 3 when mine completes. |
| 3 | Score | Shows mined job count, profile preview. "Score Jobs →" triggers score API call and advances to step 4. |
| 4 | Results | Ranked job cards. "↺ Mine Again" resets to step 1. |

Back button available on steps 3 and 4 to return to the previous step.

---

## Component Structure (all in `app/page.tsx`)

### Header
- Gradient logo icon (⛏ emoji in gradient square)
- Brand name in gradient text
- Tagline: "Mine jobs. Score your fit. Ship cover letters."

### Stepper Bar
- 4 steps with connecting lines
- States: `pending` (gray), `active` (gradient + ring shadow), `done` (gradient + ✓)
- Labels below each dot in uppercase 9px text

### Step 1 — Configure Card
- Fields: Site URL, Keywords, Profile textarea
- Hint text below each field
- "Mine Jobs →" primary gradient button

### Step 2 — Mining Card
- Animated progress bar (gradient fill, CSS animation)
- Log items list: each line is a status dot (green=done, orange=pulsing=in-progress) + message
- Auto-advances on API response

### Step 3 — Score Card
- Mined job count badge (warm bg)
- Profile preview box (warm bg, read-only)
- "Score Jobs →" primary button + "← Back" ghost button

### Step 4 — Results Card
- Header: title + job count summary (`N strong matches out of M jobs`) + "↺ Mine Again" ghost button
- "Top Matches" section label (jobs with score ≥70)
- "Other Results" section label (score <70 jobs)
- Low-score jobs (score <40) rendered at 60% opacity

### Job Card
- Border: warm (`#fed7aa`) for top matches, neutral for others
- Box shadow on top matches
- Header row: title + company/location left, score badge right
- AI reason line (italic, warm text) — only shown if score exists
- Actions row: "View job ↗" link + "✉ Generate cover letter" / "✉ Cover letter ▾" button
- **Cover letter expands inline** below a divider inside the same card when generated

---

## State Shape (unchanged from current)

```ts
type Job = { id, site, title, company, location, url, description, score, reason }
const [currentStep, setCurrentStep] = useState<1|2|3|4>(1)
const [siteUrl, setSiteUrl]
const [keyword, setKeyword]
const [profile, setProfile]
const [jobs, setJobs]
const [coverLetters, setCoverLetters]   // Record<number, string>
const [loadingMine, setLoadingMine]
const [loadingScore, setLoadingScore]
const [loadingCover, setLoadingCover]   // Record<number, boolean>
const [error, setError]
```

Mining completion → `setCurrentStep(3)`. Scoring completion → `setCurrentStep(4)`.

---

## Error Handling

Errors display as a warm-tinted alert box inside the active step card (below the action buttons). Clears on next action.

---

## Files Changed

| File | Change |
|---|---|
| `app/page.tsx` | Full rewrite — wizard structure, new Tailwind classes |
| `app/globals.css` | Add brand color tokens to `@theme inline` block |
| `app/globals.css` | Minor — ensure body bg uses warm neutral `#fafaf9` |

No new packages. No new files beyond the above.

---

## Acceptance Criteria

- User can mine jobs from ITviec and see saved jobs
- Step 3 shows mined job count + small preview list of job titles before scoring
- Score action scores max 20 jobs (MVP cap — pass `limit: 20` to score API)
- Results are sorted by score descending
- Cover letter generated only on explicit per-job button click (no auto-generation)
- Cover letter expands inline inside its job card
- Empty states shown: no jobs mined yet, no scored results yet
- Error states shown clearly inside the active step card
- No autofill, no auto-submit on any input or step transition
- No new npm packages added

---

## Out of Scope

- Profile persistence across sessions (future)
- LinkedIn crawler (already stubbed)
- Dark mode
- Mobile-specific optimizations beyond responsive Tailwind defaults
