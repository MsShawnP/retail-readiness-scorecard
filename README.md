# Retail Readiness Scorecard

A self-contained diagnostic that tells a specialty food executive whether they are actually ready for a major retailer launch — before the buyer conversation, not six months after.

**Live:** https://lailarallc.com/scorecard

## What it does

Select a target retailer, answer 12–18 adaptive questions, receive a Red / Yellow / Green scorecard across eight operational dimensions, and download a branded PDF. Runs offline from a single HTML file — no login, no server, no internet connection required after download.

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

## Why it matters

Most brands hear "yes" from a buyer and find out six months later that they were not ready — after the slotting fees are paid, the POs are flowing, and the OTIF fines start. A failed launch at a major retailer is expensive twice: once in direct costs, and again in the years before that buyer will take the meeting again. This tool runs the due diligence before the conversation, so the launch-blocking gaps get fixed on the brand's timeline instead of discovered on the retailer's.

## Quick start

```bash
npm install
npm run build   # outputs dist/retail-readiness-scorecard.html
```

Output is a single inlined `.html` file (~395 KB gzip). Open it in any browser. No server required.

Development and tests:

```bash
npm run dev     # Vite dev server with HMR at localhost:5173
npm test        # Vitest — 37 unit tests covering scoring engine and flow engine
```

## Tech stack

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
    flow.js               Question flow state machine — branching, gate logic
  data/
    questions.js          All 24 questions with retailer-specific language
    retailers.js          Retailer definitions — thresholds, EDI sets, portal names
  ui/                     Screens, SVG chart, jsPDF export
  styles/                 CSS — variables, layout, components, progress bar
scoring_engine/           Python + YAML scoring audit trail (independent of JS build)
docs/retailer-specs/      Walmart / Costco / Whole Foods spec research
dist/                     Built output (gitignored, rebuild with npm run build)
```

### Technical notes

- Fonts must live in `src/fonts/`, not `public/`, for vite-plugin-singlefile to inline them
- jsPDF fonts loaded via Vite `?base64` import and registered with the jsPDF VFS before any PDF call
- Scoring thresholds are defined per-retailer in `src/data/retailers.js` and mirrored in `scoring_engine/` YAML for auditability

## Data contract

**Cinderhaven canonical dataset:** 50 SKUs / 5 production lines / 6 retailers. This tool intentionally covers a 3-retailer subset (Walmart, Costco, Whole Foods) — not data drift.

## License

MIT — see [LICENSE](LICENSE).

---

Built by [Lailara LLC](https://lailarallc.com) — decision frameworks and operational tooling for specialty food brands scaling into national retail.
