# Retail Readiness Scorecard

A self-contained diagnostic tool for specialty food brand executives evaluating a major retailer launch. Select a target retailer, answer 12–18 adaptive questions, receive a Red / Yellow / Green scorecard across eight operational dimensions, and download a branded PDF. Runs offline from a single HTML file — no login, no server, no internet connection required after download.

**[Try it live →](https://msshawnp.github.io/retail-readiness-scorecard/)**

## What it does

Most brands hear "yes" from a buyer and find out six months later that they were not ready. This tool runs the due diligence before the conversation, not after.

**Three supported retailers:** Walmart · Costco · Whole Foods

**Eight scored dimensions:**

| Dimension | What it evaluates |
|---|---|
| Product Data | GTIN compliance, 1WorldSync/GDSN syndication status |
| Syndication | Item setup completeness for the target retailer's portal |
| EDI Capability | 850/856/810 capability, SSCC-18, retailer-specific requirements |
| Fulfillment | Fill rate history, OTIF track record, carrier setup |
| Financial Readiness | Working capital, slotting fee coverage, deduction reserve |
| Production Capacity | Lead times, co-packer contracts, surge capacity |
| Compliance | Labeling, certifications, FSMA traceability readiness |
| Team & Process | Dedicated retail ops capacity, dispute management, reporting |

Each dimension scores Red (launch-blocking, < 30%), Yellow (needs work, 30–69%), or Green (ready, ≥ 70%). Retailer-specific thresholds apply — Walmart's Fulfillment threshold is higher than Whole Foods' because the OTIF requirements are stricter.

**Gate questions.** Some answers immediately force a dimension Red regardless of other answers. Whole Foods: a prohibited-ingredient flag or missing GFSI certification locks Compliance to Red. The tool skips follow-up questions in gated dimensions and moves on.

**PDF export.** Branded to the brand's name and retailer. Programmatic vector output — no rasterization. File named `[BrandName]-[Retailer]-Readiness-[MonthYYYY].pdf`.

## Build

```bash
npm install
npm run build   # outputs dist/retail-readiness-scorecard.html
```

Output is a single inlined `.html` file (~395 KB gzip). Open it in any browser. No server required.

## Dev

```bash
npm run dev     # Vite dev server with HMR at localhost:5173
```

## Tests

```bash
npm test        # Vitest — 37 unit tests covering scoring engine and flow engine
```

## Stack

- Vanilla JavaScript (ES modules, no framework)
- Vite + vite-plugin-singlefile (inlines all assets into one `.html`)
- jsPDF v4 (programmatic vector PDF — no html2canvas)
- Hand-written SVG charts (no Chart.js, no D3)
- Fontsource (Playfair Display + Source Sans 3, woff2 inlined at build time)
- Lailara Design System v2 (CSS custom properties)
- Vitest (unit tests for scoring and flow engines)

## Project structure

```
src/
  main.js                 App entry point — state management, screen transitions
  engine/
    scoring.js            Red/Yellow/Green thresholds + retailer-specific adjustments
    scoring.test.js
    flow.js               Question flow state machine — branching, gate logic
    flow.test.js
  data/
    questions.js          All 24 questions with retailer-specific language
    retailers.js          Retailer definitions — thresholds, EDI sets, portal names
  ui/
    screens.js            Render functions for all five screens
    chart.js              SVG horizontal bar chart
    pdf.js                jsPDF export
  styles/                 CSS — variables, layout, components, progress bar
scoring_engine/           Python + YAML scoring audit trail (human-readable, independent of JS build)
docs/
  brainstorms/            Requirements doc
  retailer-specs/         Walmart / Costco / Whole Foods spec research
dist/
  retail-readiness-scorecard.html   Built output (gitignored, rebuild with npm run build)
```

## Technical notes

- Fonts must live in `src/fonts/`, not `public/`, for vite-plugin-singlefile to inline them
- jsPDF fonts loaded via Vite `?base64` import and registered with the jsPDF VFS before any PDF call
- Scoring thresholds are defined per-retailer in `src/data/retailers.js` and mirrored in `scoring_engine/` YAML for auditability

## License

MIT — see [LICENSE](LICENSE).

---

Built by [Lailara LLC](https://lailarallc.com) — decision frameworks and operational tooling for specialty food brands scaling into national retail.
