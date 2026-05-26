---
status: active
date: 2026-05-26
type: feat
origin: docs/brainstorms/retail-readiness-scorecard-requirements.md
retailer-research: docs/retailer-specs/retailer-specs-research.md
---

# feat: Build Retail Readiness Scorecard — Single-File HTML Diagnostic Tool

## Summary

Build a single self-contained `.html` file that guides specialty food brand executives through a 12–18 question adaptive diagnostic interview and produces a retailer-specific readiness scorecard. Red/Yellow/Green across 8 operational dimensions. Horizontal SVG bar chart. Dark callout card with Top 3 Blockers. jsPDF export. Fully offline — no server, no CDN, no external requests ever. Lailara design system throughout.

---

## Problem Frame

Specialty food brands at $3M–$20M commit to major retailer launches — Walmart, Costco, Whole Foods — without running a systematic readiness diagnostic. The CEO takes the buyer meeting and says yes. Then the scramble: item setup incomplete, EDI not configured, co-packer can't ramp, slotting fees not modeled. First shipments trigger chargebacks. OTIF fines hit. Retailer scorecards start in the red.

The cost is asymmetric: a failed Walmart launch runs $200K–$750K in year one. Catching the gaps before the pitch costs a fraction of that. No self-service tool currently does this across all 8 operational dimensions with retailer-specific thresholds. This tool fills that gap. (Full problem narrative: `docs/brainstorms/retail-readiness-scorecard-requirements.md` — Problem Frame.)

---

## High-Level Technical Design

*This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Architecture: single-page state machine

```
[State Object]
  retailer: 'walmart' | 'costco' | 'wholeFoods'
  brandName: string
  answers: { [questionId]: 'yes' | 'partial' | 'no' }
  currentQuestionIndex: number
  completedDimensions: Set<string>
  scores: { [dimension]: { status, numeric, findings, fix } }

[Flow]
  intro screen
    → retailer select (Q1)
    → brand name input (Q2)
    → question loop:
        flow.js determines next question from bank
        if gate answer is Red → score dimension, mark complete, skip follow-ups
        if all questions for a dimension answered → compute dimension score
        if all 8 dimensions have scores → render results
    → results screen
        compute top 3 blockers
        render dark callout card
        render SVG bar chart
        render 8 dimension cards
        PDF export button
```

### SVG chart structure

Each bar row is ~36px tall. Label column is 160px wide, bar area is 300px wide, score label is right-aligned. Bar fill width = `(numericScore / 100) * 300px`. Bar color = status color token.

```
| Product Data      [████████████████████░░░░░░░░░]  72%  |
| Syndication       [██████░░░░░░░░░░░░░░░░░░░░░░░]  38%  |
| EDI Capability    [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  0%   |
```

### jsPDF scorecard layout

Letter-size portrait. Three sections:
1. Dark header card (brand name, retailer, date, overall verdict, top 3 blockers)
2. Bar chart section (8 programmatic rectangles, labeled)
3. Findings section (dimension name, status, key finding, fix)

Fonts registered in jsPDF VFS using TTF files (separate from CSS woff2 fonts).

### Scoring model

Each dimension has a pool of 1–4 questions. Each answer contributes 0–3 points. `numeric = (earned / maxPossible) * 100`. Thresholds: Green ≥ 70, Yellow 30–69, Red < 30. Gate answers with `isRedGate: true` set score to 0, skip follow-ups. Retailer-specific multipliers adjust thresholds (e.g., Walmart Fulfillment Green threshold = 75 because OTIF 98% is stricter than Whole Foods).

Whole Foods Compliance special case: prohibited ingredients OR missing required cert → dimension forced Red regardless of other answers, flagged with `hardGate: true` in findings.

### Remediation timeline (rule-based)

Each Red dimension contributes a week-range to the total:
- EDI Red: 8–12 wk
- Syndication Red: 4–6 wk
- Product Data Red: 2–4 wk
- Compliance Red (WFM): 6–10 wk; (Walmart/Costco): 2–4 wk
- Fulfillment Red: 4–8 wk
- Financial Red: 2–4 wk
- Production Red: 4–8 wk
- Team Red: 1–2 wk

Yellow dimensions add 0 weeks (they're risk-elevating but not blocking). Timeline = sum of Red week-ranges. Output: "Estimated X–Y weeks to close these gaps."

---

## Output Structure

```
retail-readiness-scorecard/
  src/
    index.html                    — HTML shell (single entry point)
    main.js                       — JS entry point, imports all modules
    fonts.css                     — @font-face declarations → src/fonts/
    styles/
      variables.css               — Lailara design tokens (colors, type scale, spacing)
      layout.css                  — screen transitions, container, responsive
      components.css              — buttons, option cards, dimension cards, callout card
      progress.css                — progress indicator
    fonts/
      playfair-700.woff2          — CSS display font (Fontsource pre-subsetted Latin)
      source-sans3-400.woff2
      source-sans3-600.woff2
      playfair-700.ttf            — jsPDF font (TTF required, separate from woff2)
      source-sans3-400.ttf
      source-sans3-600.ttf
    data/
      retailers.js                — retailer spec data, scoring thresholds, display names
      questions.js                — full question bank (~24 questions, retailer variants)
    engine/
      scoring.js                  — scoring functions → dimension scores + top blockers
      flow.js                     — question flow state machine (sequencing, branching)
    ui/
      screens.js                  — renders intro, question, and results screens
      chart.js                    — SVG horizontal bar chart renderer
      pdf.js                      — jsPDF scorecard generator
  scoring_engine/
    retailers/
      walmart.yaml
      costco.yaml
      whole-foods.yaml
    score.py                      — Python scoring script (auditable parallel artifact)
  dist/
    retail-readiness-scorecard.html   — built output (requires .gitignore negation)
  vite.config.js
  package.json
  .gitignore                      — needs !dist/retail-readiness-scorecard.html
```

---

## Implementation Units

### U1. Project scaffold and build configuration

**Goal:** Initialize the project with Vite + vite-plugin-singlefile, download and place fonts, configure the build pipeline to produce a single offline-capable HTML file, and fix the `.gitignore` conflict.

**Requirements:** R1 (single-file, no external requests), R20 (fonts embedded as base64)

**Dependencies:** none

**Files:**
- `package.json` — create
- `vite.config.js` — create
- `src/index.html` — create (minimal HTML shell)
- `src/main.js` — create (empty entry point)
- `src/fonts.css` — create (@font-face declarations)
- `src/fonts/` — create directory, place 6 font files (3 woff2 + 3 TTF)
- `.gitignore` — modify: add `!dist/retail-readiness-scorecard.html` negation

**Approach:**
- Install: `vite`, `vite-plugin-singlefile` (v2.3.0), `jspdf` (v4.x)
- vite.config.js uses `viteSingleFile({ useRecommendedBuildConfig: true, removeViteModuleLoader: true })`
- `build.outDir: 'dist'`, `build.emptyOutDir: true`
- All fonts sourced from `@fontsource/playfair-display` and `@fontsource/source-sans-3` npm packages (Latin-only woff2 already pre-subsetted). TTF equivalents downloaded from the same Fontsource package.
- `fonts.css` uses `@font-face` with relative paths pointing to `./fonts/*.woff2` — Vite traces these and converts to base64 data URIs
- TTF files imported in `pdf.js` using Vite's `?base64` asset query: `import playfairBoldB64 from '../fonts/playfair-700.ttf?base64'`
- `.gitignore` currently contains `*.html` which would block `dist/retail-readiness-scorecard.html`. Add `!dist/retail-readiness-scorecard.html` as a negation on the line immediately after.

**Test scenarios:**
- `npm run build` completes without errors and produces `dist/retail-readiness-scorecard.html`
- `dist/retail-readiness-scorecard.html` is a single file — no sibling `.js` or `.css` files in `dist/`
- File size is under 600KB
- Opening `dist/retail-readiness-scorecard.html` in a browser with network access blocked (DevTools → offline) does not produce any network errors in the console
- `git status` after build shows `dist/retail-readiness-scorecard.html` as a tracked (not ignored) file
- The file opens and does not throw JS errors in Chrome, Safari, Firefox, or Edge

**Verification:** `npm run build` succeeds, output is a single file under 600KB, opens offline with no console errors.

---

### U2. Lailara design system CSS

**Goal:** Implement all CSS — Lailara design tokens, screen layout system, interactive components (option buttons, callout card, dimension cards, progress indicator) — to match the design system spec.

**Requirements:** R19, R20, R21, R22, R23

**Dependencies:** U1

**Files:**
- `src/styles/variables.css` — create
- `src/styles/layout.css` — create
- `src/styles/components.css` — create
- `src/styles/progress.css` — create
- `src/main.js` — modify: import all CSS files

**Approach:**

*Design tokens (variables.css):*
- Canvas bg: `--canvas: #f5f3ee`
- Text primary: `--text-primary: #333333`
- Text secondary: `--text-secondary: #595959`
- Navy: `--navy: #1f2e7a`, hover: `--navy-hover: #141e52`
- Red: `--status-red: #cc100a`
- Yellow: `--status-yellow: #b8860b`
- Green: `--status-green: #158f75`
- Dark card bg: `--card-dark-bg: #1a1a1a`
- Border radius: `--radius: 2px`

*Screen layout (layout.css):*
- `body` background = `--canvas`, font = Source Sans 3
- `.screen` class: full viewport, centered, only one visible at a time via `display:none`/`display:flex`
- `max-width: 900px`, auto margins, `padding: 48px 24px` desktop / `32px 16px` mobile
- Mobile breakpoint at 640px

*Components (components.css):*
- `.btn-primary`: Navy bg, white text, 2px radius, `font-weight: 600`, hover to navy-hover, `focus-visible` outline
- `.option-btn`: border card style, full width, left-aligned text, selected state = navy border + navy text, `cursor: pointer`
- `.callout-card`: `--card-dark-bg` background, white/grey text per dark card tokens (from CLAUDE.md design system), `padding: 32px`, 2px radius
- `.dimension-card`: Canvas bg, 1px `--gridline` border left-accented by status color (3px left border: red/yellow/green), status badge chip
- `.status-badge`: 12px Source Sans 3, 500 weight, colored background chip (low-opacity status color bg, full-opacity status color text)

*Progress indicator (progress.css):*
- Linear text indicator: "Question N of ~M" — no visual bar (avoids revealing total question count which changes with branching). Simple `font-size: 14px`, text-secondary color.

*Transitions:*
- `.screen` fade in/out: `opacity 200ms ease-out`
- `@media (prefers-reduced-motion: reduce)` disables transitions

**Test scenarios:**
- All Lailara color tokens are present in `variables.css` and match the exact hex values in the design system
- Option buttons show correct selected state (navy border, navy text) on click
- Dark callout card renders with `#1a1a1a` background and white text
- Dimension cards show 3px left border in the correct status color (red/yellow/green)
- On 320px viewport width, no horizontal scrollbar, text readable
- `prefers-reduced-motion: reduce` results in no transition animation (verify in DevTools)

**Verification:** Open `index.html` in dev server, visually confirm all screen components render with correct Lailara tokens.

---

### U3. Retailer data, scoring engine, and YAML artifacts

**Goal:** Define all retailer-specific data and implement the scoring engine — the pure logic that converts answers into dimension scores. Also produce the parallel YAML artifact in `scoring_engine/`.

**Requirements:** R8, R9, R10, R11, R24, R25

**Dependencies:** U1

**Files:**
- `src/data/retailers.js` — create
- `src/engine/scoring.js` — create
- `scoring_engine/retailers/walmart.yaml` — create
- `scoring_engine/retailers/costco.yaml` — create
- `scoring_engine/retailers/whole-foods.yaml` — create
- `scoring_engine/score.py` — create

**Approach:**

*retailers.js* defines per-retailer constants used in both question text and scoring:
- Display name, OTIF threshold (Walmart: 98%, Costco: "appointment-based", Whole Foods: "~97% target"), penalty description, EDI required sets, key credibility details for question phrasing
- `fulfillmentGreenThreshold` per retailer (Walmart = 75 numeric, Costco = 70, Whole Foods = 65) reflecting differing strictness

*scoring.js* — pure functions, no DOM:
- `scoreDimension(dimension, answers, retailer)` → `{ status: 'red'|'yellow'|'green', numeric: 0-100, findings: string[], fix: string, hardGate?: boolean }`
- `computeScores(allAnswers, retailer)` → map of all 8 dimension results
- `getTopBlockers(scores)` → top 3 by priority (Reds first, then Yellows, then by dimension weight)
- `getOverallVerdict(scores, retailer)` → `{ verdict: string, timeline: string }`
- Dimension weights for priority ranking: EDI (5), Fulfillment (5), Syndication (4), Product Data (4), Financial (3), Compliance (3), Production (2), Team (2)
- Whole Foods Compliance hard gate: if `answers.wf_compliance_ingredients === 'no'` (contains prohibited ingredients), force `status: 'red'`, `hardGate: true`, skip all other compliance questions

*Scoring thresholds from retailer research (see `docs/retailer-specs/retailer-specs-research.md`):*
- Walmart OTIF: 98% composite → Fulfillment question options reference this threshold. OTIF option scoring: above 98% = 3pts, 93-97% = 1pt, below 93% = 0pt (Red gate)
- Walmart FSMA 204: ASN must include FSMA 204 KDEs (August 2025 requirement) → added to EDI dimension
- Costco OTIF: no published % → Fulfillment question is "Do you have consistent on-time delivery with documented history?" (qualitative)
- Whole Foods OTIF: ~97% target (low confidence) → use qualitative framing, not threshold comparison
- Whole Foods Compliance: prohibited ingredients + GFSI/SQF/BRCGS certification required → hard gate logic

*YAML files* in `scoring_engine/retailers/` mirror the JS scoring rules in human-readable format. Each file contains: retailer name, dimensions array (each with: threshold_green, threshold_yellow, questions, scoring rules per answer option). This is the open-source contribution referenced in R24.

*score.py* reads YAML files and implements the same scoring logic as `scoring.js` — accepts a JSON input of answers + retailer, returns JSON scores. Validates that YAML rules produce identical results to test fixtures.

**Test scenarios:**
- `scoreDimension('edi', { edi_gate: 'no' }, 'walmart')` returns `{ status: 'red', numeric: 0, hardGate implied }` (covers AE1)
- `scoreDimension('fulfillment', { fulfillment_otif: 'yes' }, 'walmart')` returns Green; same answer for `costco` returns Green; question text differs by retailer (covers AE2)
- `getTopBlockers(scores)` with 2 Reds + 4 Yellows returns the 2 Reds + highest-priority Yellow as top 3 (covers AE3)
- `getOverallVerdict` with all Green returns "Ready for [Retailer]"
- `getOverallVerdict` with 3+ Reds returns "Not Ready for [Retailer] Launch"
- Whole Foods: `scoreDimension('compliance', { wf_compliance_ingredients: 'no' }, 'wholeFoods')` returns Red with `hardGate: true` regardless of certification answers
- Walmart FSMA 204: a question answer of 'no' to FSMA KDE capability contributes to EDI Red
- Remediation timeline for 1 EDI Red + 1 Syndication Red = "12–18 weeks" (8-12 + 4-6)
- `score.py` run on a test fixture produces output identical to the JS scoring engine for all 3 retailers

**Verification:** All test cases pass with `npx vitest run`. YAML files contain all 3 retailers with complete scoring rules per dimension.

---

### U4. Question bank and flow engine

**Goal:** Define the full question bank (all ~24 questions with retailer-specific text variants) and implement the adaptive flow engine that sequences questions, handles branching, and tracks dimension completion.

**Requirements:** R2, R3, R4, R5, R6, R7

**Dependencies:** U3 (question bank references retailer data and scoring dimension IDs)

**Files:**
- `src/data/questions.js` — create
- `src/engine/flow.js` — create
- `src/engine/flow.test.js` — create (Vitest)

**Approach:**

*questions.js* — question bank as an array of question objects:
```
{
  id: string,
  dimension: string,       // one of the 8 dimension IDs
  isGate: boolean,         // gate questions can trigger Red + skip follow-ups
  retailers: string[],     // which retailers this question applies to (all = ['walmart','costco','wholeFoods'])
  text: {                  // retailer-specific question text
    walmart: string,
    costco: string,
    wholeFoods: string,
    default?: string       // fallback if all identical
  },
  options: [               // exactly 3 options, ordered yes/partial/no
    { value: 'yes'|'partial'|'no', label: { walmart, costco, wholeFoods } }
  ],
  redGateValues: string[], // answer values that trigger Red gate (usually ['no'])
  order: number            // sort order within dimension
}
```

Question bank covers all 8 dimensions × 3 retailers:
- **Product Data (2-3 questions):** Gate: GTINs valid and in GS1 registry? Follow-up: trade item hierarchy documented (each/inner/case)? Walmart follow-up: Item 360 GDSN attributes complete?
- **Syndication (2 questions):** Gate: 1WorldSync/GDSN account active? Follow-up: % SKUs syndicated to target retailer's system?
- **EDI Capability (3-4 questions):** Gate: can receive 850 PO + send 856 ASN electronically? Follow-up: ASN transmitted before gate-in/arrival? Walmart-only: ASN includes FSMA 204 KDEs? GS1-128 labels with SSCC-18 matching ASN?
- **Fulfillment (2-3 questions):** Gate: OTIF rate vs retailer threshold (Walmart 98%, Costco appointment-based, WFM ~97%)? Follow-up: GS1-128 shipping labels compliant? Costco: thermal transfer printing (not direct thermal)?
- **Financial Readiness (2 questions):** Gate: year-one retailer cost modeled (slotting, trade spend, 60-90 day terms)? Follow-up: cash runway sufficient for first 90 days including chargeback buffer?
- **Production Capacity (2 questions):** Gate: co-packer confirmed capacity for projected launch volume? Follow-up: lead time for production run (are you inside the buyer's timeline)?
- **Compliance (2-3 questions):** Gate (WFM): product contains artificial colors/flavors/preservatives? Gate (all): FSMA PCQI documentation current? WFM follow-up: GFSI/SQF/BRCGS certification current? General follow-up: allergen declarations consistent?
- **Team & Process (2 questions):** Gate: named person owns day-to-day retailer relationship? Follow-up: defined process for chargebacks and deductions?

*flow.js* — state machine (pure functions, no DOM):
- `initFlow(retailer, brandName)` → initial flow state
- `getNextQuestion(state, questionBank)` → next question to show (null if assessment complete)
- `answerQuestion(state, questionId, answer, questionBank)` → new state with answer recorded, dimension scored if gate-Red or if all dimension questions answered, completedDimensions updated
- `isComplete(state)` → true when all 8 dimensions have scores
- Sequencing: questions sorted by dimension, then by `order` within dimension. Whole Foods Compliance gate question floated to first position within the dimension for WFM retailer.
- Branching: `redGateValues.includes(answer.value)` → mark dimension complete, add to `completedDimensions`, skip remaining questions for that dimension

**Test scenarios:**
- `getNextQuestion` after WFM compliance gate answered 'no' returns the next dimension's first question, not the WFM compliance follow-up (covers AE1 branching behavior)
- `getNextQuestion` after Walmart EDI gate answered 'no' returns next dimension's first question (covers AE1)
- `answerQuestion` with EDI gate = 'no' produces state where EDI dimension is complete with Red score and no follow-up questions remain (covers AE1)
- `isComplete(state)` returns false after 7 dimensions scored, true after all 8
- Total questions seen on a "worst case" path (no Red gates, all partials) is ≤ 18
- Total questions seen on a "best case" path (all Red gates) is ≥ 12 (retailer + brand name + 1 gate per dimension = 10 gates + 2 setup = 12)
- Question text for Walmart OTIF question references "98%" threshold; Costco version references "appointment window" not a percentage (covers AE2)
- WFM Compliance gate question is the first question shown in the Compliance dimension for Whole Foods retailer selection

**Verification:** `npx vitest run src/engine/flow.test.js` passes all scenarios. Manual walkthrough of a full Walmart assessment path produces exactly the correct sequence.

---

### U5. Intro screen and question screen UI

**Goal:** Implement the visible interface for the assessment flow — intro screen, retailer selection, brand name input, and the adaptive question screen with fade transitions and progress indicator.

**Requirements:** R2, R3, R4, R5, R7, R23, F1

**Dependencies:** U2 (CSS), U4 (flow engine)

**Files:**
- `src/ui/screens.js` — create
- `src/main.js` — modify: wire up flow engine to screen rendering, handle answer events

**Approach:**

*Intro screen:*
- Playfair Display 700 heading: "If the Buyer Says Yes Tomorrow, What Breaks First?"
- One-sentence framing (Source Sans 3 17px): "A 10-minute diagnostic that tells you where your operation is ready — and where it isn't."
- Navy primary button: "Start the Assessment"
- No login prompt, no email field, no progress bar

*Retailer selection (Q1):*
- Three option cards: Walmart, Costco, Whole Foods
- Each card shows retailer name (Playfair 700 22px) + one-line description of why this retailer is distinctive ("Mass market, strictest OTIF requirements" / "Club retail, appointment-based compliance" / "Natural/specialty, certification-driven")
- Selecting a card highlights it (navy border) and enables "Continue" button
- Not labeled as "Question 1" — presented as a setup step

*Brand name input (Q2):*
- Text input: "Your brand name" placeholder
- Subtitle: "Used only to title your scorecard — not stored or shared."
- Continue button enabled after any input (empty allowed — defaults to "Your Brand" in output)

*Question screen:*
- Question text: Playfair Display 22px, max-width 660px
- Three option buttons (full width, stacked): letter labels removed, plain text options
- Selected option highlighted with navy left border and navy text
- "Continue" button appears after selection (not before)
- Progress text: "Question {n} of {estimate}" — estimate = current position in sequence; shown as ~14 when branching not yet resolved (updates as branching reduces total)
- "Back" link (text-secondary, no button style) returns to previous question; state reverts to prior answer

*Transitions:*
- Screen fade uses CSS opacity transition: `.screen { opacity: 0; transition: opacity 200ms ease-out }` → `.screen.visible { opacity: 1 }`
- JS adds/removes `.visible` class; a ~10ms setTimeout between removing from old screen and adding to new screen ensures transition fires
- `@media (prefers-reduced-motion: reduce)`: transitions: none, screen switches are instant

*State management:*
- All state lives in a plain JS object in `main.js` (no localStorage, no sessionStorage — R1/stateless requirement)
- On page refresh, state resets to intro — expected and documented behavior

**Test scenarios:**
- Clicking a retailer card shows it with navy highlight; other cards return to unselected state
- Continue button on retailer selection is disabled before a retailer is clicked, enabled after
- Submitting brand name with empty input results in a default value used downstream (not an error)
- Question screen shows exactly 3 option buttons for every question in the bank
- Selecting an option enables the Continue button
- Clicking "Back" after answering a question returns to the previous question with the prior answer pre-selected
- On 320px viewport, all three option buttons are visible without horizontal scroll
- With `prefers-reduced-motion: reduce` set in OS, screen transitions are instant (no fade)

**Verification:** Full manual walkthrough of a Walmart assessment path: intro → retailer → brand name → all questions → results screen renders. All branching gates work (answer "No" to EDI gate, EDI follow-ups do not appear).

---

### U6. Results screen and SVG bar chart

**Goal:** Implement the results screen — dark callout card with overall verdict and Top 3 Blockers, inline SVG horizontal bar chart for 8 dimensions, and individual dimension finding cards with portfolio tool links.

**Requirements:** R8, R11, R12, R13, R14, R15, F1 (outcome), F2 (trigger)

**Dependencies:** U2 (CSS), U3 (scoring engine), U5 (screen system)

**Files:**
- `src/ui/chart.js` — create (SVG bar chart renderer)
- `src/ui/screens.js` — modify: add `renderResults(state)` function
- `src/styles/components.css` — modify: add results-screen-specific styles

**Approach:**

*`chart.js` — SVG horizontal bar chart:*
- `renderBarChart(scores)` → returns an SVG string or DOM element
- 8 rows, ~36px row height. Label column: 160px. Bar track: full remaining width minus label and score label. Bar fill: `(numeric / 100) * trackWidth`. Color: status color token.
- Track background: `#d9d9d9` (Lailara gridline color)
- Score label right-aligned: shows percentage ("72%") in text-secondary
- Dimension labels use Source Sans 3 12px (chart axis text size from design system)
- No chart title (the callout card above provides context)
- No interactive tooltips — dimension cards below provide the detail
- SVG dimensions: `width="100%"` `viewBox="0 0 560 312"` (8 rows × 39px)

*Dark callout card (Lailara dark card pattern):*
- `#1a1a1a` background, `padding: 32px`, `border-radius: 2px`
- Overall verdict line: Playfair Display 28px white — "Not Ready for Walmart Launch" / "3 Gaps to Close Before Costco"
- Top 3 Blockers: each as a row with a colored status chip (Red/Yellow) + dimension name + one-line finding
- Estimated remediation: "Estimated 14–22 weeks to close these gaps." Source Sans 3 16px, `#d8d8d8`
- Optional: 1-line "what this means" framing sentence in `#9a9a9a`

*Dimension cards (below chart):*
- One card per dimension, in a consistent order (same as chart top-to-bottom)
- Left border: 3px, status color (red/yellow/green)
- Status badge chip in top-right corner
- Dimension name: Source Sans 3 600 16px
- Findings: 1–2 bullet points from `scores[dimension].findings[]`
- "What to fix": one-line Source Sans 3 14px, text-secondary
- Portfolio link (when status Red or Yellow, for Product Data / EDI / Fulfillment only): small linked text "→ Run the [Tool Name]" with `href="#"` placeholder (replace with real URL before launch)

*PDF button:*
- Navy primary button: "Download PDF Scorecard"
- Positioned below all dimension cards
- On click: calls `generatePDF(state)` from `pdf.js` (U7)

**Test scenarios:**
- With all 8 dimension scores computed, bar chart renders 8 bars (one per dimension)
- Bar fill widths are proportional to numeric scores (a 72% score produces a bar at 72% of track width)
- Green bar fill color = `#158f75`, Yellow = `#b8860b`, Red = `#cc100a`
- Dark callout card shows exactly 3 items in Top Blockers list, matching `getTopBlockers()` output (covers AE3)
- Overall verdict text matches `getOverallVerdict()` output for the test scenario
- Dimension card for EDI (when Red) includes portfolio link text "→ Run the EDI Pre-flight tool"
- Dimension card for Product Data (when Yellow) includes portfolio link text "→ Run the GTIN Validator"
- Dimension card for Fulfillment (when Red) includes portfolio link "→ See The 150 Cases"
- Dimension cards for Syndication, Financial, Production, Compliance, Team do NOT include portfolio links
- On 320px mobile viewport, all dimension cards are readable and stacked vertically without horizontal scroll

**Verification:** Complete a full Walmart assessment through the UI; results screen renders with correct colors, correct top 3 blockers, correct portfolio links on affected dimensions.

---

### U7. PDF export (jsPDF)

**Goal:** Implement the branded PDF scorecard export — draws the scorecard programmatically using jsPDF, registers custom fonts (TTF), and produces a consistently formatted file across all target browsers.

**Requirements:** R16, R17, R18, F2

**Dependencies:** U3 (scores), U6 (results screen, to confirm layout parity)

**Files:**
- `src/ui/pdf.js` — create
- `src/fonts/playfair-700.ttf` — already placed in U1; imported here with `?base64`
- `src/fonts/source-sans3-400.ttf` — same
- `src/fonts/source-sans3-600.ttf` — same

**Approach:**

*Font registration:*
- Import TTF files using Vite's `?base64` asset query: `import playfairB64 from '../fonts/playfair-700.ttf?base64'`
- Register in jsPDF VFS: `doc.addFileToVFS('Playfair-Bold.ttf', playfairB64)`, then `doc.addFont('Playfair-Bold.ttf', 'Playfair', 'bold')`
- Same pattern for Source Sans 3 Regular and SemiBold

*PDF layout (Letter size, portrait, 8.5" × 11" = 216mm × 279mm):*

**Page 1 — Scorecard:**
- Margin: 15mm all sides
- Section 1 (header card, ~45mm tall): filled rectangle `#1a1a1a`. Brand name + retailer in Playfair 700 18pt white. Date in Source Sans 3 11pt `#d8d8d8`. Overall verdict in Playfair 700 22pt white below.
- Section 2 (top 3 blockers, ~35mm): still on dark card. Three rows: colored 8px × 8px square (status color) + dimension name + one-line finding in Source Sans 3 10pt `#ededed`.
- Section 3 (bar chart, ~70mm): white background. Section label "Readiness by Dimension" in Source Sans 3 600 11pt `#595959`. 8 bar rows: label (Source Sans 3 10pt), gray track rect, colored fill rect, percentage text. Uses exact same color values as SVG chart.
- Section 4 (dimension findings, ~100mm): "Key Findings" header. For each dimension: bold dimension name + status chip color + 1-2 findings in Source Sans 3 10pt. If page overflows, `doc.addPage()` and continue.
- Footer: "Generated [Month Year] · lailara.com" in Source Sans 3 9pt `#595959`, right-aligned, 10mm from bottom.

*File naming and download:*
- `doc.save(\`${brandName}-${retailerName}-Readiness-${monthYear}.pdf\`)`
- Spaces in brandName replaced with hyphens
- `monthYear` formatted as "May2026"

*Cross-browser consistency:*
- jsPDF programmatic rendering is browser-independent (no DOM capture, no CSS dependency)
- The only browser-dependent part is the download trigger (`doc.save()`) — this uses standard `<a download>` mechanism, which is consistent across all target browsers (Chrome/Safari/Firefox/Edge on Windows and macOS)

**Test scenarios:**
- Clicking "Download PDF Scorecard" triggers a file download (no browser print dialog appears) (covers AE4, AE5 partially)
- Downloaded file is named `[BrandName]-[Retailer]-Readiness-[MonthYYYY].pdf` per the pattern (covers R17)
- PDF contains the brand name entered in the assessment
- PDF header card renders with dark background and white text (visually verify)
- PDF bar chart shows 8 bars with colors matching the results screen
- PDF renders identically when downloaded on Chrome/Windows vs Safari/macOS (covers AE5)
- PDF does not trigger any network requests (verify via browser DevTools network panel during generation) (covers AE4)
- If brand name is empty (user skipped), PDF title uses "Your Brand" as fallback

**Verification:** Run full assessment, click download, open PDF — header, bars, and findings match the on-screen results. Filename is correctly formatted. No network activity in DevTools during PDF generation.

---

## Scope Boundaries

### Deferred for later

*(From origin document — carried verbatim)*
- UNFI and KeHE retailer scoring (post-MVP; YAML spec structure in `scoring_engine/` is designed to accommodate additional retailers by adding new YAML files)
- CSV upload for automated Product Data dimension scoring (self-assessment only for MVP)
- Additional retailers (Target, Sprouts, regional chains)
- Quantitative data inputs beyond range-based options (e.g., live OTIF rate entry with precise scoring)
- Localization / non-English language support

### Outside this product's identity

*(From origin document — carried verbatim)*
- User accounts, saved assessments, or result persistence — the tool is deliberately stateless and privacy-safe
- Email gating of the scorecard or PDF — sharing friction is the enemy of the broker referral mechanic
- Remediation execution or project management — the tool diagnoses; it does not fix
- Post-launch performance monitoring — separate portfolio pieces
- A backend scoring API — the tool is a static artifact, not a service

### Deferred to follow-up work

- Playwright end-to-end test covering the full F1 flow (assessment completion + PDF download) — valuable but adds toolchain complexity; defer to after initial ship
- Portfolio tool URLs: `src/ui/screens.js` uses `href="#"` placeholders for GTIN Validator, EDI Pre-flight, and The 150 Cases links. Replace with live URLs before public launch.
- Hosting setup (Netlify or similar) and custom domain configuration
- Vitest coverage report and CI pipeline

---

## Key Technical Decisions

- **SVG bar chart over Chart.js:** Chart.js (even tree-shaken) adds ~160KB, pushing total file to ~640KB over budget. Hand-written SVG bars deliver the same visual with zero library weight, render as vectors (crisper at any zoom), and draw natively in jsPDF via `doc.rect()` — no `canvas.toDataURL()` needed. For a Red/Yellow/Green status indicator (not a live-updating data chart), animation adds no value. (see origin: R12, Key Decisions — "Horizontal bar chart over radar chart")
- **Vite + vite-plugin-singlefile v2.3:** Single-file output requirement with base64 font inlining is exactly the problem this plugin solves. Fonts placed in `src/fonts/` (not `public/`) and imported through CSS so Vite traces and inlines them. `removeViteModuleLoader: true` removes ~2KB of boilerplate not needed for a single-entry tool.
- **jsPDF v4.x programmatic drawing (no html2canvas):** Drawing the scorecard programmatically with `doc.rect()` and `doc.text()` produces a true vector PDF, consistent across browsers without capturing DOM state. html2canvas would add ~100KB and produce a rasterized output that degrades at high print resolution. (see origin: Key Decisions — "jsPDF embedded for PDF export")
- **TTF fonts for jsPDF (separate from CSS woff2):** jsPDF's VFS requires TTF format. Both Fontsource packages include TTF files alongside woff2. Import TTF via Vite's `?base64` asset query; register via `addFileToVFS` + `addFont`. This is a separate import path from the CSS @font-face declarations.
- **Fontsource pre-subsetted Latin fonts:** Fontsource packages ship Latin-only woff2 files (Playfair 700: 23KB, Source Sans 3 variants: ~16KB each). Base64-encoded, 4 fonts total ~102KB. Using pre-subsetted Fontsource files avoids the `pyftsubset` build step while staying well within budget.
- **Numeric score (0-100) mapped from answer points:** Scoring engine produces a numeric percentage per dimension (earned points / max points × 100) alongside the categorical R/Y/G status. The numeric score drives bar fill widths in the SVG chart. This gives viewers a sense of "how Red" or "how close to Green" — more informative than a uniform full-width bar.
- **Stateless assessment (no persistence):** Browser refresh resets the tool to the intro screen. By design — R3 states brand name is not stored or transmitted. This is a feature, not a bug: the tool is explicitly privacy-safe with zero data retention.

---

## Dependencies / Assumptions

- **npm/Node.js required for build:** Vite requires Node.js (v18+). The distributed artifact is a standalone HTML file with no runtime dependency, but the build step requires a Node environment.
- **Fontsource font packages:** `@fontsource/playfair-display` and `@fontsource/source-sans-3` must be npm-installed. TTF files live at `node_modules/@fontsource/*/files/*.ttf`. Woff2 files at `node_modules/@fontsource/*/files/*.woff2`.
- **Portfolio tool URLs are placeholders:** GTIN Validator, EDI Pre-flight, and The 150 Cases link targets are `href="#"` during build. Must be replaced with live URLs before public launch.
- **Costco OTIF threshold:** No published percentage exists publicly. The Fulfillment dimension for Costco uses qualitative framing ("consistent on-time delivery with documented history") rather than threshold comparison. This is intentional and documented in `docs/retailer-specs/retailer-specs-research.md`.
- **Whole Foods OTIF target:** 97% sourced from a single secondary source (low confidence). Question language uses "target" framing, not "requirement" framing, to reflect this uncertainty.
- **jsPDF hex color support:** jsPDF v4.x is confirmed to accept hex strings in `setFillColor()` and `setTextColor()`. If a version discrepancy causes issues, fall back to RGB integer calls.

---

## Outstanding Questions

### Resolve Before Planning

- None.

### Deferred to Planning / Implementation

- [Affects U3][Content] Exact question wording for all ~24 questions and their 3 response options per retailer. The structure is defined here; the copywriting is implementation work. Use Lailara voice (declarative, no marketing language) and embed specific retailer thresholds where confirmed in `docs/retailer-specs/retailer-specs-research.md`.
- [Affects U3][Content] Scoring point values per answer option per dimension. Rough framework defined in this plan (0-3 per answer); exact values tuned during implementation based on whether thresholds produce sensible R/Y/G splits in test scenarios.
- [Affects U6, U7][Technical] PDF page overflow handling: if 8 dimension finding cards exceed one page, `doc.addPage()` is needed. Confirm during U7 implementation whether findings fit on Letter page or require pagination logic.
- [Affects U1][Technical] Confirm Node.js version on development machine is ≥ v18 before starting U1.
