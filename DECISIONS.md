# Retail Readiness Scorecard — Decisions Log

Permanent record of choices that should survive session turnover.
If a decision is reversed, strike it through and add the replacement
below — don't delete.

---

## Format

Each entry:
- **Date** — when decided
- **Decision** — one sentence, imperative voice
- **Why** — the reasoning, including what was tried and rejected
- **Scope** — what this applies to (file, chunk, deliverable, or "global")
- **Do not** — explicit anti-instructions, if any

---

## Architecture & Pipeline

### 2026-05-26 — Use single-file HTML (Vite + vite-plugin-singlefile) as the build architecture
- **Why:** The offline-first constraint (must work with no internet connection, no loading spinner) eliminates every server-based option. Streamlit was considered and rejected: zero design control, wrong interaction model for a questionnaire, outputs look like data science demos rather than consulting deliverables. Single-file HTML with all assets inlined is the only approach that satisfies offline + instant load + Lailara design fidelity + professional PDF export.
- **Scope:** Global — this is the project's foundational architecture.
- **Do not:** Do not introduce a server, CDN dependency, or external fetch at any point. All CSS, JS, fonts, and libraries must be inlined in the output HTML.

---

## Data & Schema

[Decisions about data sources, schemas, transformations]

---

## Visualization

### 2026-05-26 — Use hand-written SVG for the results bar chart, not Chart.js
- **Why:** Chart.js tree-shaken is ~160KB; combined with jsPDF (~350KB) the file would exceed the 600KB budget. SVG is also the better technical fit: these are static R/Y/G status bars, not interactive data charts — no animation, no tooltip library, no axes needed. SVG renders crisper at any zoom, works natively in jsPDF for PDF export, and keeps the rendering ~5KB vs ~160KB.
- **Scope:** Results screen chart (`src/ui/results.js` and `src/ui/chart.js`).
- **Do not:** Do not add Chart.js, D3, or any charting library. The bar chart is intentionally hand-coded SVG.

---

## Output Formats

### 2026-05-26 — Use jsPDF v4 programmatic drawing for PDF export, not html2canvas
- **Why:** html2canvas rasterizes the page — the PDF looks like a screenshot, not a document, and degrades when printed or zoomed. Programmatic jsPDF drawing (doc.rect(), doc.text(), TTF fonts via addFileToVFS) produces crisp vector output that scales cleanly and forwards professionally. html2canvas also adds ~90KB to the bundle. The "CEO forwards this PDF" use case demands vector quality.
- **Scope:** PDF export module (`src/ui/export.js`).
- **Do not:** Do not add html2canvas. jsPDF draws all PDF content directly — no DOM capture. TTF fonts (not woff2) must be imported via Vite's `?base64` query and registered with jsPDF's VFS.

---

## Writing & Voice

[Voice, style, terminology decisions specific to this project]

---

## Reversed / Superseded

When a decision is overturned:
1. Strike through the original entry above (don't delete)
2. Add a new entry below with the replacement decision
3. Note the link in both directions

This preserves the history of why something is the way it is.
