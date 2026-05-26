---
date: 2026-05-26
topic: retail-readiness-scorecard
---

# Retail Readiness Scorecard

## Summary

A single-file HTML diagnostic tool that guides specialty food brand executives through a 12–18 question adaptive interview and produces a retailer-specific readiness scorecard — Red/Yellow/Green across 8 operational dimensions — with a branded PDF export. Runs fully offline, no server, no CDN.

---

## Problem Frame

Every growing specialty food brand faces the same moment: a major retailer says yes. The CEO says yes back — because of course they do. Then the scramble begins. Item setup forms need data the brand doesn't have organized. The co-packer can't ramp on the timeline. Cash to cover slotting fees and 60–90 day payment terms hasn't been modeled. The EDI connection doesn't exist.

The root cause is always the same: nobody ran the diagnostic before the pitch. The brand assumed product quality equals retail readiness. It doesn't. Retail readiness is a systems problem — data, ops, cash, capacity, compliance — and most brands at $3M–$20M have never formally assessed it. The broker says "you'll be fine" because the broker gets paid when the deal closes, not when the first shipment arrives clean.

No self-service tool currently exists that is interactive, multi-dimensional, retailer-specific, and aimed at the mid-market specialty food segment. Generic blog checklists exist. Retailer-published vendor guides exist but are overwhelming and non-diagnostic. The closest data tool (1WorldSync) covers only the product data dimension. Nothing ties all 8 dimensions — data, syndication, EDI, fulfillment, financial, production, compliance, team — into a single coherent assessment.

The cost asymmetry is clear: a failed Walmart launch runs $200K–$750K in year one for a $15M–$20M brand. Catching the gaps before the pitch costs a fraction of that.

---

## Actors

- A1. **Brand executive (CEO/COO/CFO):** Takes the assessment, usually in a meeting or before a buyer pitch. Primary user.
- A2. **Ops team member (COO, supply chain lead, etc.):** Receives the PDF scorecard forwarded by A1. Uses it as a project brief for remediation. Does not directly take the assessment.
- A3. **Broker:** Shares the tool link with brands in their portfolio as a "run this before your next pitch" referral mechanism.

---

## Key Flows

- F1. **Assessment completion**
  - **Trigger:** A1 opens the HTML file (from email, USB, or web URL) without an internet connection.
  - **Actors:** A1
  - **Steps:**
    1. Tool loads instantly. Intro screen shows title, one-sentence framing, and a Start button.
    2. A1 selects target retailer (Walmart, Costco, or Whole Foods).
    3. A1 enters brand name (used to personalize the PDF title).
    4. Questions appear one at a time in conversational style — no dimension labels visible. Each question presents 3 options.
    5. Gate questions control branching: a clearly negative answer (Red gate) skips follow-up questions for that dimension and scores it Red immediately.
    6. After the final question, the results screen renders automatically.
  - **Outcome:** A1 has a complete scorecard showing 8 dimensions, their status, and specific findings.
  - **Covered by:** R1, R2, R3, R4, R5, R6, R7

- F2. **PDF export and forwarding**
  - **Trigger:** A1 clicks "Download PDF" on the results screen.
  - **Actors:** A1, A2
  - **Steps:**
    1. PDF generates in-browser using an embedded library — no server call.
    2. File downloads as `[BrandName]-[Retailer]-Readiness-Assessment-[MonthYear].pdf`.
    3. A1 forwards the PDF to A2 or shares it in a meeting.
  - **Outcome:** A2 has a portable, consistently formatted scorecard they can act on.
  - **Covered by:** R15, R16, R17

- F3. **Broker referral share**
  - **Trigger:** A3 wants to share the tool with a brand.
  - **Actors:** A3, A1
  - **Steps:**
    1. A3 shares the hosted URL (or the HTML file itself as an attachment).
    2. A1 opens it with no account, no login, no friction.
  - **Outcome:** A1 completes the assessment without any setup or installation.
  - **Covered by:** R1, R8

---

## Requirements

**Assessment flow**

- R1. The tool runs entirely from a single `.html` file with all CSS, JavaScript, and fonts inlined — no external requests required at any point.
- R2. The first question asks the user to select their target retailer. MVP options: Walmart, Costco, Whole Foods. The selection drives all subsequent question language and scoring thresholds.
- R3. The second question collects the brand name as a short text input. This value is used only to personalize the PDF title; it is not stored or transmitted.
- R4. Questions appear one at a time in a conversational style with no dimension labels visible during the assessment. The experience feels like a guided interview, not a form.
- R5. Each question offers exactly 3 response options. Options use plain language specific to the selected retailer where thresholds matter (e.g., "Walmart requires 98% OTIF — what is your current rate?" with options reflecting ranges relative to that threshold).
- R6. Gate questions control branching: when a gate answer indicates a dimension is clearly unready (e.g., "we have no EDI capability"), the tool scores that dimension Red and skips the follow-up questions for it.
- R7. The total question count is 12–18 questions depending on the branching path taken.

**Scoring**

- R8. Each dimension scores Red (launch-blocking), Yellow (risk-elevating), or Green (ready) based on the combination of answers in that dimension.
- R9. Scoring thresholds are retailer-specific. The same answer may score differently depending on which retailer was selected in R2.
- R10. The 8 scored dimensions are: Product Data, Syndication, EDI Capability, Fulfillment, Financial Readiness, Production Capacity, Compliance, and Team & Process.
- R11. After all dimensions are scored, the tool identifies the top 3 highest-priority gaps — the Red or Yellow findings most likely to block a successful launch.

**Results screen**

- R12. The results screen shows a horizontal bar chart with one bar per dimension. Each bar is colored Red, Yellow, or Green according to its score.
- R13. Below the chart, each dimension has a card showing its status, 1–2 specific findings drawn from the user's answers, and a one-line "what to fix" statement.
- R14. A dark callout card at the top of the results shows: the overall verdict (e.g., "Not Ready for Walmart"), the 3 top blockers by name, and a rule-based estimated remediation timeline (e.g., "8–12 weeks to close these gaps").
- R15. Dimension cards for Product Data, EDI Capability, and Fulfillment include a one-line link to the relevant portfolio tool (GTIN Validator, EDI Pre-flight, The 150 Cases) when that dimension scores Red or Yellow.

**PDF export**

- R16. A "Download PDF" button on the results screen generates a PDF of the scorecard using a library embedded within the HTML file — no server call, no browser print dialog.
- R17. The PDF filename follows the pattern: `[BrandName]-[Retailer]-Readiness-[MonthYYYY].pdf`.
- R18. The PDF output is consistent across Chrome, Safari, Firefox, and Edge on Windows and macOS.

**Design**

- R19. The tool uses the Lailara design system: Playfair Display for headings and the overall verdict, Source Sans 3 for body text and question options, canvas background `#f5f3ee`, Chicago navy `#1f2e7a` for the primary button and active states.
- R20. All fonts are embedded as base64-encoded woff2 within the single HTML file — no Google Fonts CDN call.
- R21. Status colors: Red = `#cc100a` (Lailara brand red), Yellow = `#b8860b` (dark goldenrod, readable against canvas), Green = `#158f75` (HK-35 teal).
- R22. The tool is fully functional and readable on mobile (320px minimum width) as well as desktop.
- R23. Transitions between questions use a simple fade — respects `prefers-reduced-motion`.

**Retailer spec artifact**

- R24. The scoring rules for all 3 MVP retailers are also expressed in a human-readable format in `scoring_engine/` — either YAML or Python — so the logic is auditable and can be updated independently of the HTML tool.
- R25. Retailer thresholds used in scoring are research-accurate: Walmart OTIF 98%, GTIN hierarchy, Item 360 requirements; Costco case pack and GTIN-14 expectations; Whole Foods attribute and certification requirements. Planning phase must verify these against current retailer documentation.

---

## Acceptance Examples

- AE1. **Covers R6, R8.** Given the user has selected Walmart and the gate question is "Can you send an 856 ASN electronically?", when the user selects "No," the EDI dimension scores Red and the 3 follow-up EDI questions do not appear.
- AE2. **Covers R5, R9.** Given the user has selected Walmart, when the OTIF question appears, the options reference Walmart's 98% threshold. Given the user has selected Whole Foods, when the same underlying question appears, the options reference Whole Foods' threshold (to be confirmed in research).
- AE3. **Covers R14.** Given the user's assessment produces 2 Red dimensions and 4 Yellow dimensions, when the results screen renders, the dark callout card shows the 2 Red dimensions plus the highest-priority Yellow dimension as the "Top 3 Blockers."
- AE4. **Covers R1.** Given the HTML file is opened from a local filesystem on a device with no internet connection, when the user completes the full assessment and downloads the PDF, no network request is made at any point.
- AE5. **Covers R16, R18.** Given the user is on Safari/macOS and clicks "Download PDF," the downloaded file renders the scorecard identically to a user on Chrome/Windows.

---

## Success Criteria

- A CEO can open the file from their desktop in a meeting, complete the assessment, and hand the PDF to their COO within 10 minutes — with no internet connection required.
- A broker sharing the tool link can tell a prospect "run this before your next buyer pitch" and the prospect encounters zero friction: no login, no install, no loading spinner.
- The PDF output is professional enough that a CEO forwards it internally without modification.
- The retailer-specific question language signals practitioner knowledge — a user targeting Walmart sees Walmart's actual thresholds, not generic readiness questions.
- Planning can begin from this document without inventing product behavior, scoring logic structure, or UX flows.

---

## Scope Boundaries

### Deferred for later

- UNFI and KeHE retailer scoring (post-MVP; YAML spec structure will accommodate them)
- CSV upload for automated Product Data dimension scoring (self-assessment only for MVP)
- Additional retailers (Target, Sprouts, regional chains)
- Quantitative data inputs beyond simple range-based options (e.g., live OTIF rate entry with precise scoring)
- Localization / non-English language support

### Outside this product's identity

- User accounts, saved assessments, or result persistence — the tool is deliberately stateless and privacy-safe
- Email gating of the scorecard or PDF — sharing friction is the enemy of the broker referral mechanic
- Remediation execution or project management — the tool diagnoses; it does not fix
- Post-launch performance monitoring (OTIF tracking, chargeback dashboards) — those are separate portfolio pieces
- A backend scoring API — the tool is a static artifact, not a service

---

## Key Decisions

- **Single-file HTML over Streamlit/server:** Offline requirement and design control make a static file the only correct answer. Streamlit's styling limitations would compromise the Lailara design system and the "CEO forwards this PDF" use case.
- **Horizontal bar chart over radar chart:** Radar charts require simultaneous multi-axis interpretation — inaccessible to a non-data-scientist audience. Horizontal bars with Red/Yellow/Green coloring communicate status instantly.
- **Adaptive branching over linear flow:** Reduces question count from ~28 to ~12–18. A brand that clearly has no EDI should not sit through 3 EDI detail questions. Faster path = higher completion rate.
- **Narrative flow with no visible dimension labels:** Feels like a diagnostic interview, not a compliance form. Reduces cognitive load during the assessment; the structure is revealed at the results screen.
- **jsPDF embedded for PDF export:** Browser print-to-PDF produces inconsistent output across browsers/OS. Embedded jsPDF ensures the PDF looks identical regardless of environment — important for a document that gets forwarded professionally.
- **Retailer selection as question 1:** Retailer-specificity is the entire credibility signal. Questions must carry retailer context from the start, not be retroactively annotated at the results screen.

---

## Dependencies / Assumptions

- Retailer threshold research must be completed before scoring logic can be written. Walmart OTIF 98% is confirmed. Costco and Whole Foods thresholds for OTIF, GTIN hierarchy, and EDI requirements need verification against current documentation.
- Font embedding (base64 woff2) will increase the HTML file size by ~150–250KB. Total file size target: under 600KB. Verify this is achievable with jsPDF + Chart.js + fonts inlined.
- Portfolio tool URLs (GTIN Validator, EDI Pre-flight, The 150 Cases) must be confirmed before the results screen links them. Use placeholder `#` during build; replace before launch.

---

## Outstanding Questions

### Resolve Before Planning

- None. All product-shape decisions are resolved.

### Deferred to Planning

- [Affects R5, R9][Needs research] What are Costco's current OTIF threshold and GTIN-14 hierarchy requirements? What certification and attribute requirements does Whole Foods specify for new vendor setup?
- [Affects R16][Technical] What is the lightest-weight embedded PDF approach that produces reliable output in a single-file HTML context? jsPDF alone vs. html2canvas + jsPDF for fidelity — evaluate during planning.
- [Affects R1][Technical] What is the total inlined file size with fonts (base64 woff2) + jsPDF + Chart.js + scoring logic? If over 600KB, identify what to trim.
- [Affects R5][Technical] Exact question wording for all 12–18 questions and their 3 response options per retailer. This is content work, not product-shape work — deferred to planning/build.
- [Affects R8][Technical] Scoring weight per dimension per retailer (e.g., does EDI carry more weight for Walmart than for Whole Foods?). Define during planning based on retailer research.
