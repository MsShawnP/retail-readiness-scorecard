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

### 2026-05-26 — `?base64` font imports return URL string in dev mode, not base64 content

**Attempted:** Importing TTF fonts with `import font from '../fonts/playfair-700.ttf?base64'` and passing the result to `jsPDF.addFileToVFS()`.

**Why it didn't work:** `?base64` is not a built-in Vite query. In dev mode, Vite passes through the literal URL string `/fonts/playfair-700.ttf?base64` (30 chars). jsPDF's `addFileToVFS` calls `atob()` on that string, which throws `InvalidCharacterError`. In production build, `vite-plugin-singlefile` inlines all assets, so the full base64 content is bundled and the import resolves correctly — the bug was dev-only.

**What we tried instead:** Added a custom `base64Plugin()` to `vite.config.js` that intercepts any `transform()` call with `?base64` in the ID, reads the file from disk with `fs.readFileSync`, and returns the base64 string as the module's default export. Zero change to build output; dev mode now works identically.

**Status:** Resolved

**Tags:** jspdf, vite, fonts, base64, dev-mode

---

### 2026-05-26 — CSS opacity class toggle didn't make elements clickable in headless preview

**Attempted:** Screen transition via `.screen { opacity: 0 }` → `.screen.visible { opacity: 1 }` toggled by JS. Relied on `display: flex` always being on so elements were in the layout and clickable once visible.

**Why it didn't work:** The headless preview browser's CSS computation returned `opacity: 0` even after `.visible` was added, even with `!important`. Clicks on invisible elements fired but didn't trigger JS event handlers because the opacity-0 elements were apparently treated as non-interactive. Root cause unclear — likely a headless rendering or event-dispatch quirk.

**What we tried instead:** Replaced opacity class toggling with a CSS `@keyframes screen-fade-in` animation (`from { opacity: 0 } to { opacity: 1 }`). Elements are always at `display: flex` and always at final opacity — the animation is purely cosmetic. This meant no `.visible` class needed, no JS toggle, and elements are always interactive.

**Status:** Resolved

**Tags:** css, animation, opacity, headless, preview, transitions

---

### 2026-05-26 — Vite HMR re-execution stacked 4 event listeners and 4 appState instances

**Attempted:** Adding event listeners and initializing state directly in module scope of `main.js`.

**Why it didn't work:** Vite's HMR reconnection re-executed `main.js` up to 4 times during dev. Each execution added another `click` listener to `#app` and created a fresh `appState`, so clicking a button triggered 4 handlers against 4 different state objects — producing unpredictable transitions.

**What we tried instead:** Added `window.__rrs_initialized` guard: first execution sets the flag, adds listeners, calls `render()`. Subsequent HMR re-executions see the flag and skip. `import.meta.hot.dispose()` resets the flag to `false` so the next *full* reload reinitializes cleanly.

**Status:** Resolved

**Tags:** vite, hmr, event-listeners, state, dev-mode

---

### 2026-05-26 — jsPDF actual size (~350KB) far exceeded planning estimate (~100KB)

**Attempted:** Initial plan assumed jsPDF would be ~100KB minified, leaving room for Chart.js (~160KB tree-shaken) + fonts (~102KB base64) + logic within the 600KB single-file budget.

**Why it didn't work:** jsPDF v4 minified is ~350KB. Combined with Chart.js that totals ~640–670KB before fonts — 10–12% over budget with nothing left for the scoring engine or UI code.

**What we tried instead:** Replaced Chart.js with hand-written SVG bars (~5KB). SVG is actually the better fit: static R/Y/G status indicator (no animation needed), crisper at any zoom level, native to jsPDF for PDF rendering. Estimated total dropped to ~480–510KB well within budget.

**Status:** Resolved

**Tags:** file-size, jspdf, chart-js, svg, vite-singlefile
