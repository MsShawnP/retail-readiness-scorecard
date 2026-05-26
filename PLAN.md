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

### U1 — Vite scaffold + fonts + .gitignore fix
- [ ] `npm init -y`, install Vite, vite-plugin-singlefile v2.3.0, jsPDF v4
- [ ] Install Fontsource packages: `@fontsource/playfair-display`, `@fontsource/source-sans-3`
- [ ] Configure `vite.config.js` with viteSingleFile({ useRecommendedBuildConfig: true, removeViteModuleLoader: true })
- [ ] Create `src/` directory structure: `index.html`, `main.js`, `fonts.css`, `styles/`, `fonts/`, `data/`, `engine/`, `ui/`
- [ ] Copy woff2 font files into `src/fonts/` (NOT public/)
- [ ] Add `!dist/retail-readiness-scorecard.html` negation to `.gitignore`
- [ ] Verify `npm run build` produces `dist/retail-readiness-scorecard.html` under 600KB with no external requests

### U2 — CSS design system
- [ ] Lailara design tokens (colors, type scale, spacing) as CSS custom properties
- [ ] Intro screen layout
- [ ] Question screen layout (single question + 3 options)
- [ ] Results screen layout (callout card + bar chart + dimension cards)
- [ ] Dark callout card component
- [ ] Mobile responsive (320px minimum)
- [ ] Fade transition between questions (respects prefers-reduced-motion)

### U3 — Retailer data + scoring engine
- [ ] Create `scoring_engine/` with YAML files for Walmart, Costco, Whole Foods
- [ ] Write `score.py` that reads YAML and scores a set of answers
- [ ] Port scoring logic to `src/engine/scoring.js` (same rules, browser-runnable)
- [ ] Unit tests (Vitest) covering all 3 retailers, gate question behavior, Red/Yellow/Green thresholds
- [ ] Whole Foods Compliance hard gate logic (prohibited ingredients or missing GFSI cert → forced Red)

### U4 — Question bank + flow engine
- [ ] Write all ~24 questions in `src/data/questions.js` (retailer-specific language, 3 options each)
- [ ] Flow state machine in `src/engine/flow.js`: tracks current question, answers, branching, gate detection
- [ ] Gate question logic: Red gate answer → score dimension Red, skip follow-up questions
- [ ] Unit tests (Vitest) covering branching paths, gate skips, full 12–18 question completion

### U5 — Intro + question screen UI
- [ ] Intro screen: title, one-sentence framing, Start button
- [ ] Retailer selection screen (Walmart / Costco / Whole Foods)
- [ ] Brand name input
- [ ] Question screen: renders current question + 3 options, advances on selection
- [ ] Progress indicator (subtle — no dimension labels visible during assessment)
- [ ] Wires up to flow engine and scoring engine

### U6 — Results screen + SVG bar chart
- [ ] Overall verdict callout card (dark background, R14 spec): verdict text, top 3 blockers, remediation timeline estimate
- [ ] SVG horizontal bar chart: one bar per dimension, fill width = numeric score %, color = R/Y/G
- [ ] Dimension cards below chart: status badge, 1–2 specific findings, one-line "what to fix"
- [ ] Portfolio tool links for Product Data, EDI, Fulfillment when Red or Yellow (R15 spec — use `#` placeholders until URLs confirmed)
- [ ] Results screen fully renders from scoring engine output

### U7 — jsPDF export
- [ ] Import TTF fonts via Vite `?base64` query, register with jsPDF VFS
- [ ] Programmatic PDF layout: verdict card, bar chart (SVG coordinates → jsPDF rects), dimension cards
- [ ] "Download PDF" button wired up
- [ ] Filename pattern: `[BrandName]-[Retailer]-Readiness-[MonthYYYY].pdf`
- [ ] Cross-browser test: Chrome, Safari, Firefox, Edge (Windows + macOS)

## Out of scope for this arc

- UNFI and KeHE retailer scoring (YAML structure will accommodate post-MVP)
- CSV upload for automated Product Data scoring
- Additional retailers (Target, Sprouts, regional chains)
- User accounts, saved assessments, result persistence
- Backend scoring API
- Email gating

## Definition of done for this arc

- [ ] `npm run build` produces a single `dist/retail-readiness-scorecard.html` under 600KB
- [ ] File opens from local filesystem with no internet connection — zero network requests
- [ ] Full assessment completes for all 3 retailers (Walmart, Costco, Whole Foods)
- [ ] Gate questions correctly skip follow-up questions and score Red immediately
- [ ] Results screen shows SVG bar chart + dimension cards + dark callout card
- [ ] "Download PDF" generates a clean vector PDF with correct filename
- [ ] PDF looks identical on Chrome/Windows and Safari/macOS
- [ ] All Vitest unit tests pass for scoring engine and flow engine
- [ ] YAML scoring artifacts committed to `scoring_engine/`

---

## Arc history

### 2026-05-26 — Planning arc
- Outcome: Requirements doc, retailer specs research, and 7-unit implementation plan committed. All product and technical decisions locked. No code written.
- Tag: none

---

## Improvement history

Track when this project was reviewed and improved via /improve.
Each entry records what was found, what was fixed, and when to
check again.

<!-- Entries are added by /improve — don't delete this section -->
