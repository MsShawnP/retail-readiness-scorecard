# Retail Readiness Scorecard — Failure Log

What was attempted that didn't work, why it didn't work, and what was
tried next.

Lower bar than DECISIONS.md — capture failures even when they didn't
produce a durable rule. The whole point: future-you (or future-Claude)
shouldn't re-attempt dead ends because the lesson got lost.

---

## Format

### YYYY-MM-DD — [One-line failure description]

**Attempted:** [What was tried]

**Why it didn't work:** [Concrete reason, not "it broke." If the
failure mode was technical, name the specific issue. If the failure
mode was scope or approach, name that.]

**What we tried instead:** [The next attempt, which may also have
failed and may have its own entry below]

**Status:** Resolved / open / abandoned

**Tags:** [keywords for future text-search — e.g., "rendering, pandoc,
quarto" or "scope, scrollytelling, decoration"]

---

## Entries

[New entries get added here, most recent at the top]

### 2026-05-26 — jsPDF actual size (~350KB) far exceeded planning estimate (~100KB)

**Attempted:** Initial plan assumed jsPDF would be ~100KB minified, leaving room for Chart.js (~160KB tree-shaken) + fonts (~102KB base64) + logic within the 600KB single-file budget.

**Why it didn't work:** jsPDF v4 minified is ~350KB. Combined with Chart.js that totals ~640–670KB before fonts — 10–12% over budget with nothing left for the scoring engine or UI code.

**What we tried instead:** Replaced Chart.js with hand-written SVG bars (~5KB). SVG is actually the better fit: static R/Y/G status indicator (no animation needed), crisper at any zoom level, native to jsPDF for PDF rendering. Estimated total dropped to ~480–510KB well within budget.

**Status:** Resolved

**Tags:** file-size, jspdf, chart-js, svg, vite-singlefile
