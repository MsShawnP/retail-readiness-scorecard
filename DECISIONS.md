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
- **Scope:** PDF export module (`src/ui/pdf.js`).
- **Do not:** Do not add html2canvas. jsPDF draws all PDF content directly — no DOM capture. TTF fonts (not woff2) must be imported via Vite's `?base64` query and registered with jsPDF's VFS.

### 2026-05-26 — Apply the 600KB file size budget to gzip size, not raw HTML size
- **Why:** jsPDF ES min is 343KB alone; three TTF fonts add ~169KB base64; woff2 CSS fonts add ~73KB base64; app code adds ~40KB. Raw total ~1,072KB but gzip 395KB — well under budget. Single-file HTML is always served over HTTP with Content-Encoding: gzip; the uncompressed size is never what the user downloads. Text-heavy payloads (base64, minified JS) compress at 3–4×. Treating raw size as the metric would force dropping jsPDF (breaking PDF export), dropping fonts (breaking design system), or abandoning the single-file architecture — none of which is acceptable.
- **Scope:** Build output constraint for the lifetime of this project.
- **Do not:** Do not use raw uncompressed size as the budget metric. The build target is `gzip < 600KB`. Current: 395KB gzip.

---

### 2026-05-26 — Use CSS @keyframes for screen fade-in, not opacity class toggling

- **Why:** The original approach (`.screen { opacity: 0 }` → `.screen.visible { opacity: 1 }`) failed in the headless preview browser — opacity-0 elements were treated as non-interactive even after `.visible` was applied. `@keyframes screen-fade-in` animation makes elements always rendered at full opacity (animation is purely cosmetic), so they're always clickable and `display: flex` is always active. No JS toggle needed.
- **Scope:** `src/styles/layout.css` screen transition. All screen mounts use this pattern.
- **Do not:** Do not revert to opacity class toggling or `display: none` approaches for screen transitions. The @keyframes approach is simpler (no JS state for visibility), more accessible, and works correctly in both headless and real browsers.

### 2026-05-26 — Use window.__rrs_initialized guard to prevent HMR listener duplication

- **Why:** Vite HMR can re-execute `main.js` multiple times during dev reconnection. Each execution adds another click/keydown listener to `#app`, stacking multiple handlers against different `appState` instances. The guard (`if (!window[APP_INIT_KEY])`) ensures listeners and initial render run exactly once. `import.meta.hot.dispose()` resets the flag on module invalidation so a full re-render on the next manual reload is still clean.
- **Scope:** `src/main.js` boot block.
- **Do not:** Do not remove the HMR guard or move event listener registration outside it. Any re-execution of the boot block without the guard will stack listeners.

## Writing & Voice

[Voice, style, terminology decisions specific to this project]

---

## Reversed / Superseded

When a decision is overturned:
1. Strike through the original entry above (don't delete)
2. Add a new entry below with the replacement decision
3. Note the link in both directions

This preserves the history of why something is the way it is.
