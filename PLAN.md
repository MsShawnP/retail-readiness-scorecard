# Retail Readiness Scorecard — Current Work Plan

The current arc of work. Updated when the arc changes, not every
session. For session-by-session state, see HANDOFF.md.

---

## Goal

Build and ship a fully functional single-file HTML retail readiness scorecard tool — offline, branded, PDF-exportable — covering Walmart, Costco, and Whole Foods.

## Why this arc, why now

All planning is done. Requirements, retailer specs, and tech decisions are locked. The only thing left is building it.

## Business question this arc answers

For a $3M–$20M specialty food brand, how ready are you for your target retailer launch — and where are the specific gaps that need to be fixed before you say yes to the buyer?

## Tasks

### U1 — Vite scaffold + fonts + .gitignore fix ✅
- [x] `npm init -y`, install Vite, vite-plugin-singlefile v2.3.0, jsPDF v4
- [x] Install Fontsource packages: `@fontsource/playfair-display`, `@fontsource/source-sans-3`
- [x] Configure `vite.config.js` with viteSingleFile({ useRecommendedBuildConfig: true, removeViteModuleLoader: true })
- [x] Create `src/` directory structure: `index.html`, `main.js`, `fonts.css`, `styles/`, `fonts/`, `data/`, `engine/`, `ui/`
- [x] Copy woff2 font files into `src/fonts/` (NOT public/)
- [x] Add `!dist/retail-readiness-scorecard.html` negation to `.gitignore`
- [x] Verify `npm run build` produces `dist/retail-readiness-scorecard.html` under 600KB with no external requests

### U2 — CSS design system ✅
- [x] Lailara design tokens (colors, type scale, spacing) as CSS custom properties
- [x] Intro screen layout
- [x] Question screen layout (single question + 3 options)
- [x] Results screen layout (callout card + bar chart + dimension cards)
- [x] Dark callout card component
- [x] Mobile responsive (320px minimum)
- [x] Fade transition between questions (respects prefers-reduced-motion)

### U3 — Retailer data + scoring engine ✅
- [x] Create `scoring_engine/` with YAML files for Walmart, Costco, Whole Foods
- [x] Write `score.py` that reads YAML and scores a set of answers
- [x] Port scoring logic to `src/engine/scoring.js` (same rules, browser-runnable)
- [x] Unit tests (Vitest) covering all 3 retailers, gate question behavior, Red/Yellow/Green thresholds
- [x] Whole Foods Compliance hard gate logic (prohibited ingredients or missing GFSI cert → forced Red)

### U4 — Question bank + flow engine ✅
- [x] Write all ~24 questions in `src/data/questions.js` (retailer-specific language, 3 options each)
- [x] Flow state machine in `src/engine/flow.js`: tracks current question, answers, branching, gate detection
- [x] Gate question logic: Red gate answer → score dimension Red, skip follow-up questions
- [x] Unit tests (Vitest) covering branching paths, gate skips, full 12–18 question completion

### U5 — Intro + question screen UI ✅
- [x] Intro screen: title, one-sentence framing, Start button
- [x] Retailer selection screen (Walmart / Costco / Whole Foods)
- [x] Brand name input
- [x] Question screen: renders current question + 3 options, advances on selection
- [x] Progress indicator (subtle — no dimension labels visible during assessment)
- [x] Wires up to flow engine and scoring engine

### U6 — Results screen + SVG bar chart ✅
- [x] Overall verdict callout card (dark background): verdict text, top 3 blockers, remediation timeline estimate
- [x] SVG horizontal bar chart: one bar per dimension, fill width = numeric score %, color = R/Y/G
- [x] Dimension cards below chart: status badge, findings, one-line "what to fix"
- [x] Hard gate note on forced-Red dimensions
- [x] Results screen fully renders from scoring engine output

### U7 — jsPDF export ✅
- [x] Import TTF fonts via Vite `?base64` query, register with jsPDF VFS
- [x] Programmatic PDF layout: verdict card, bar chart (SVG coordinates → jsPDF rects), dimension cards
- [x] Export PDF button wired up
- [x] Filename pattern: `retail-readiness-{brand}.pdf`
- [x] Multi-page support with continuation headers and correct page count footers

## Out of scope for this arc

- UNFI and KeHE retailer scoring (YAML structure will accommodate post-MVP)
- CSV upload for automated Product Data scoring
- Additional retailers (Target, Sprouts, regional chains)
- User accounts, saved assessments, result persistence
- Backend scoring API
- Email gating

## Definition of done for this arc

- [x] `npm run build` produces a single `dist/retail-readiness-scorecard.html` (395KB gzip, under 600KB budget)
- [x] File opens from local filesystem with no internet connection — zero network requests
- [x] Full assessment completes for all 3 retailers (Walmart, Costco, Whole Foods)
- [x] Gate questions correctly skip follow-up questions and score Red immediately
- [x] Results screen shows SVG bar chart + dimension cards + dark callout card
- [x] Export PDF generates a clean vector PDF with Playfair/SourceSans fonts
- [ ] PDF cross-browser test: Chrome, Safari, Firefox, Edge (next session)
- [x] All Vitest unit tests pass for scoring engine and flow engine (37/37)
- [x] YAML scoring artifacts committed to `scoring_engine/`

---

## Arc history

### 2026-05-26 — Planning arc
- Outcome: Requirements doc, retailer specs research, and 7-unit implementation plan committed. All product and technical decisions locked. No code written.
- Tag: none

### 2026-05-26 — Build arc (U1–U7)
- Outcome: All 7 units shipped. Full working scorecard — intro, retailer select, brand name, adaptive 12–18 question flow, results with SVG chart, PDF export. 37/37 tests passing. 395KB gzip. Remaining: cross-browser PDF test.
- Tag: none

---

## Improvement history

Track when this project was reviewed and improved via /improve.
Each entry records what was found, what was fixed, and when to
check again.

<!-- Entries are added by /improve — don't delete this section -->
