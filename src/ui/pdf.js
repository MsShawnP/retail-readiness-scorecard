/**
 * pdf.js — jsPDF export for the retail readiness scorecard.
 *
 * Programmatic layout: no html2canvas, no DOM capture.
 * Fonts registered via Vite's ?base64 query — inlined at build time.
 *
 * Layout (letter, portrait, 0.6in margins):
 *   - Header: Lailara brand / report title / brand+retailer / date
 *   - Overall verdict callout box (dark bg)
 *   - Horizontal bar chart (8 dimensions)
 *   - Dimension detail section (findings + fix per dimension)
 *   - Footer: page numbers
 */

import { jsPDF } from 'jspdf';

// Vite inlines these as base64 strings at build time
import playfair700   from '../fonts/playfair-700.ttf?base64';
import sourceSans400 from '../fonts/source-sans3-400.ttf?base64';
import sourceSans600 from '../fonts/source-sans3-600.ttf?base64';

import { DIMENSIONS, DIMENSION_LABELS, getTopBlockers, getOverallVerdict } from '../engine/scoring.js';
import { RETAILERS } from '../data/retailers.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_W     = 215.9;  // letter width mm
const PAGE_H     = 279.4;  // letter height mm
const MARGIN_L   = 15.24;  // 0.6 in
const MARGIN_R   = 15.24;
const MARGIN_T   = 15.24;
const MARGIN_B   = 15.24;
const CONTENT_W  = PAGE_W - MARGIN_L - MARGIN_R;

// Colors (r, g, b)
const COLOR_INK        = [13,  13,  13];
const COLOR_NAVY       = [31,  46,  122];
const COLOR_CANVAS     = [245, 243, 238];
const COLOR_GRIDLINE   = [217, 217, 217];
const COLOR_TEXT_SEC   = [89,  89,  89];
const COLOR_RED        = [204, 16,  10];
const COLOR_YELLOW     = [184, 134, 11];
const COLOR_GREEN      = [21,  143, 117];
const COLOR_DARK_BG    = [26,  26,  26];
const COLOR_WHITE      = [255, 255, 255];

const STATUS_COLORS = {
  red:    COLOR_RED,
  yellow: COLOR_YELLOW,
  green:  COLOR_GREEN,
};

const STATUS_LABELS = { red: 'Red', yellow: 'Yellow', green: 'Green' };

// ─── Font setup ──────────────────────────────────────────────────────────────

let fontsRegistered = false;

function registerFonts(doc) {
  if (fontsRegistered) return;
  doc.addFileToVFS('playfair-700.ttf',    playfair700);
  doc.addFileToVFS('sourcesans-400.ttf',  sourceSans400);
  doc.addFileToVFS('sourcesans-600.ttf',  sourceSans600);
  doc.addFont('playfair-700.ttf',   'Playfair', 'bold');
  doc.addFont('sourcesans-400.ttf', 'SourceSans', 'normal');
  doc.addFont('sourcesans-600.ttf', 'SourceSans', 'bold');
  fontsRegistered = true;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function serif(doc, size) {
  doc.setFont('Playfair', 'bold');
  doc.setFontSize(size);
}

function sans(doc, size, weight = 'normal') {
  doc.setFont('SourceSans', weight);
  doc.setFontSize(size);
}

function color(doc, rgb) {
  doc.setTextColor(...rgb);
}

function fill(doc, rgb) {
  doc.setFillColor(...rgb);
}

function stroke(doc, rgb) {
  doc.setDrawColor(...rgb);
}

function rect(doc, x, y, w, h, style = 'F') {
  doc.rect(x, y, w, h, style);
}

function line(doc, x1, y1, x2, y2) {
  doc.line(x1, y1, x2, y2);
}

/** Wrap text and return new y position after drawing. */
function wrappedText(doc, text, x, y, maxW, lineH) {
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return y + lines.length * lineH;
}

// ─── Page management ─────────────────────────────────────────────────────────

function addPage(doc) {
  doc.addPage('letter', 'portrait');
}

function addFooter(doc, pageNum, totalPages, retailerLabel, brandName) {
  sans(doc, 7.5);
  color(doc, COLOR_TEXT_SEC);
  const footerY = PAGE_H - MARGIN_B + 4;
  doc.text(`${brandName} · ${retailerLabel} Readiness Scorecard`, MARGIN_L, footerY);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN_R, footerY, { align: 'right' });
  stroke(doc, COLOR_GRIDLINE);
  doc.setLineWidth(0.2);
  line(doc, MARGIN_L, footerY - 2, PAGE_W - MARGIN_R, footerY - 2);
}

// ─── Section: Header ─────────────────────────────────────────────────────────

function drawHeader(doc, brandName, retailerLabel, dateStr) {
  let y = MARGIN_T;

  // Brand mark
  sans(doc, 9, 'bold');
  color(doc, COLOR_NAVY);
  doc.text('LAILARA', MARGIN_L, y);

  // Date right-aligned
  sans(doc, 9);
  color(doc, COLOR_TEXT_SEC);
  doc.text(dateStr, PAGE_W - MARGIN_R, y, { align: 'right' });

  y += 6;

  // Report title
  serif(doc, 20);
  color(doc, COLOR_INK);
  doc.text('Retail Readiness Scorecard', MARGIN_L, y);
  y += 8;

  // Brand / Retailer
  sans(doc, 11);
  color(doc, COLOR_TEXT_SEC);
  doc.text(`${brandName}  ·  ${retailerLabel}`, MARGIN_L, y);
  y += 4;

  // Rule
  stroke(doc, COLOR_GRIDLINE);
  doc.setLineWidth(0.3);
  line(doc, MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 8;

  return y;
}

// ─── Section: Verdict callout ─────────────────────────────────────────────────

function drawVerdictCallout(doc, y, scores, retailer, brandName) {
  const { verdict, timeline, overallStatus } = getOverallVerdict(scores, retailer);
  const retailerLabel = RETAILERS[retailer]?.shortName ?? retailer;
  const topBlockers = getTopBlockers(scores);

  const BOX_H = 54;
  const INNER_PAD = 7;

  // Dark background
  fill(doc, COLOR_DARK_BG);
  rect(doc, MARGIN_L, y, CONTENT_W, BOX_H, 'F');

  let iy = y + INNER_PAD;

  // Label
  sans(doc, 7.5);
  color(doc, [154, 154, 154]);
  doc.text('LAILARA — RETAIL READINESS SCORECARD', MARGIN_L + INNER_PAD, iy);
  iy += 6;

  // Verdict
  serif(doc, 16);
  color(doc, COLOR_WHITE);
  doc.text(verdict, MARGIN_L + INNER_PAD, iy);
  iy += 6;

  // Brand/retailer
  sans(doc, 9);
  color(doc, [216, 216, 216]);
  doc.text(`${brandName}  ·  ${retailerLabel}`, MARGIN_L + INNER_PAD, iy);
  iy += 6;

  // Top blockers: 3 in a row
  sans(doc, 7.5, 'bold');
  color(doc, [154, 154, 154]);
  doc.text('TOP PRIORITIES', MARGIN_L + INNER_PAD, iy);
  iy += 4;

  const colW = CONTENT_W / 3;
  topBlockers.forEach((dim, i) => {
    const s = scores[dim];
    const label = DIMENSION_LABELS[dim] ?? dim;
    const cx = MARGIN_L + INNER_PAD + i * colW;

    // Color dot
    fill(doc, STATUS_COLORS[s.status] ?? COLOR_RED);
    doc.circle(cx + 1.5, iy - 1.5, 1.5, 'F');

    sans(doc, 8, 'bold');
    color(doc, COLOR_WHITE);
    doc.text(label, cx + 5, iy);
  });
  iy += 4;

  // Timeline
  sans(doc, 8);
  color(doc, [216, 216, 216]);
  doc.text(timeline, MARGIN_L + INNER_PAD, iy);

  return y + BOX_H + 8;
}

// ─── Section: Bar chart ───────────────────────────────────────────────────────

function drawBarChart(doc, y, scores) {
  serif(doc, 13);
  color(doc, COLOR_INK);
  doc.text('Scorecard by Dimension', MARGIN_L, y);
  y += 6;

  const LABEL_W  = 52;
  const BAR_X    = MARGIN_L + LABEL_W + 4;
  const BAR_MAX  = CONTENT_W - LABEL_W - 18;
  const ROW_H    = 7.5;
  const BAR_H    = 3.5;

  DIMENSIONS.forEach((dim, i) => {
    const s = scores[dim] ?? { status: 'red', numeric: 0 };
    const ry = y + i * ROW_H;
    const barW = (s.numeric / 100) * BAR_MAX;
    const barY = ry + (ROW_H - BAR_H) / 2;

    // Label
    sans(doc, 8);
    color(doc, COLOR_TEXT_SEC);
    doc.text(DIMENSION_LABELS[dim] ?? dim, MARGIN_L + LABEL_W, ry + ROW_H / 2, {
      align: 'right',
      baseline: 'middle',
    });

    // Track
    fill(doc, [240, 240, 235]);
    rect(doc, BAR_X, barY, BAR_MAX, BAR_H, 'F');

    // Fill
    if (barW > 0) {
      fill(doc, STATUS_COLORS[s.status] ?? COLOR_RED);
      rect(doc, BAR_X, barY, barW, BAR_H, 'F');
    }

    // Percentage
    sans(doc, 7.5, 'bold');
    color(doc, STATUS_COLORS[s.status] ?? COLOR_RED);
    doc.text(`${s.numeric}%`, BAR_X + BAR_MAX + 2, ry + ROW_H / 2, {
      align: 'left',
      baseline: 'middle',
    });
  });

  y += DIMENSIONS.length * ROW_H + 4;

  // Chart footnote
  sans(doc, 7);
  color(doc, COLOR_TEXT_SEC);
  doc.text('Red <30 · Yellow 30–69 · Green ≥70. Scores weighted by retailer requirement severity.', MARGIN_L, y);
  y += 7;

  return y;
}

// ─── Section: Dimension details ───────────────────────────────────────────────

/**
 * Draw one dimension card. Returns new y after the card.
 */
function drawDimensionCard(doc, y, dim, score, pageUsed) {
  const label    = DIMENSION_LABELS[dim] ?? dim;
  const statusC  = STATUS_COLORS[score.status] ?? COLOR_RED;
  const findings = score.findings ?? [];
  const fix      = score.fix ?? '';
  const CARD_PAD = 4;
  const BORDER_W = 2;

  // Estimate card height to check page break
  const findingsLines = findings.flatMap(f => doc.splitTextToSize(f, CONTENT_W - 40));
  const fixLines = fix && (findings.length > 0 || score.status !== 'green')
    ? doc.splitTextToSize(fix, CONTENT_W - 40)
    : [];
  const contentLines = findings.length > 0 ? findingsLines.length + fixLines.length : 1 + fixLines.length;
  const estimatedH = 12 + contentLines * 4.5 + CARD_PAD * 2;

  // Page break if needed
  if (y + estimatedH > PAGE_H - MARGIN_B - 15) {
    return null; // Signal caller to add new page
  }

  // Left border
  fill(doc, statusC);
  rect(doc, MARGIN_L, y, BORDER_W, estimatedH, 'F');

  // Background
  fill(doc, [255, 255, 255]);
  rect(doc, MARGIN_L + BORDER_W, y, CONTENT_W - BORDER_W, estimatedH, 'F');

  // Light card stroke
  stroke(doc, [240, 240, 235]);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN_L + BORDER_W, y, CONTENT_W - BORDER_W, estimatedH, 'S');

  let cy = y + CARD_PAD + 3.5;
  const textX = MARGIN_L + BORDER_W + CARD_PAD + 2;
  const textW  = CONTENT_W - BORDER_W - CARD_PAD * 2 - 2;

  // Dimension name
  sans(doc, 10, 'bold');
  color(doc, COLOR_INK);
  doc.text(label, textX, cy);

  // Status badge (right-aligned)
  const badge = `${STATUS_LABELS[score.status]} · ${score.numeric}%`;
  sans(doc, 8);
  color(doc, statusC);
  doc.text(badge, MARGIN_L + CONTENT_W - 4, cy, { align: 'right' });

  cy += 5;

  // Findings
  if (findings.length > 0) {
    findings.forEach(finding => {
      sans(doc, 8);
      color(doc, COLOR_TEXT_SEC);
      const wrapped = doc.splitTextToSize(`– ${finding}`, textW);
      doc.text(wrapped, textX, cy);
      cy += wrapped.length * 4;
    });
  } else {
    sans(doc, 8);
    color(doc, COLOR_TEXT_SEC);
    doc.text('No critical gaps identified.', textX, cy);
    cy += 4;
  }

  // Fix suggestion
  if (fix && (findings.length > 0 || score.status !== 'green')) {
    cy += 1;
    sans(doc, 7.5);
    color(doc, [130, 130, 130]);
    const wrapped = doc.splitTextToSize(`Fix: ${fix}`, textW);
    doc.text(wrapped, textX, cy);
    cy += wrapped.length * 3.8;
  }

  return y + estimatedH + 3;
}

// ─── Dimension → engagement mapping ──────────────────────────────────────────

const DIMENSION_ENGAGEMENTS = {
  productData: { name: 'Product Data Health Audit', url: 'lailarallc.com/work/product-data-health-audit' },
  syndication: { name: 'Product Data Health Audit', url: 'lailarallc.com/work/product-data-health-audit' },
  edi:         { name: 'Retail Readiness & Launch', url: 'lailarallc.com/work/retail-readiness-launch' },
  fulfillment: { name: 'Fulfillment & OTIF Diagnostic', url: 'lailarallc.com/work/fulfillment-otif' },
  financial:   { name: 'Retail Readiness & Launch', url: 'lailarallc.com/work/retail-readiness-launch' },
  production:  { name: 'Fulfillment & OTIF Diagnostic', url: 'lailarallc.com/work/fulfillment-otif' },
  compliance:  { name: 'Retail Readiness & Launch', url: 'lailarallc.com/work/retail-readiness-launch' },
  team:        { name: 'Trade Spend & Deduction Recovery', url: 'lailarallc.com/work/trade-spend-deduction-recovery' },
};

// ─── Section: Next Steps ─────────────────────────────────────────────────────

function drawNextSteps(doc, y, scores, retailerLabel, brandName) {
  const redDims = DIMENSIONS.filter(d => scores[d]?.status === 'red');
  const seen = new Set();
  const dedupedLinks = redDims
    .map(d => ({ dim: d, ...DIMENSION_ENGAGEMENTS[d] }))
    .filter(item => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

  const estimatedH = 20 + Math.max(dedupedLinks.length, 1) * 12 + 20;
  if (y + estimatedH > PAGE_H - MARGIN_B - 15) {
    addPage(doc);
    y = MARGIN_T;
    sans(doc, 8, 'bold');
    color(doc, COLOR_NAVY);
    doc.text('LAILARA', MARGIN_L, y);
    sans(doc, 8);
    color(doc, COLOR_TEXT_SEC);
    doc.text(`${brandName}  ·  ${retailerLabel} Readiness`, MARGIN_L + 12, y);
    y += 8;
  }

  serif(doc, 13);
  color(doc, COLOR_INK);
  doc.text('Next Steps', MARGIN_L, y);
  y += 6;

  if (dedupedLinks.length > 0) {
    sans(doc, 9);
    color(doc, COLOR_TEXT_SEC);
    y = wrappedText(doc, 'Each Red dimension has a scoped engagement that addresses it:', MARGIN_L, y, CONTENT_W, 4.5);
    y += 3;

    dedupedLinks.forEach(item => {
      const label = DIMENSION_LABELS[item.dim] ?? item.dim;
      fill(doc, COLOR_RED);
      doc.circle(MARGIN_L + 2, y - 1.2, 1.5, 'F');

      sans(doc, 9, 'bold');
      color(doc, COLOR_INK);
      doc.text(label, MARGIN_L + 7, y);

      sans(doc, 9);
      color(doc, COLOR_NAVY);
      doc.text(`${item.name}  ·  ${item.url}`, MARGIN_L + 7, y + 4.5);
      y += 12;
    });
  } else {
    sans(doc, 9);
    color(doc, COLOR_TEXT_SEC);
    y = wrappedText(doc, 'No Red dimensions — ahead of most brands at this stage. Visit lailarallc.com/contact to discuss tightening the remaining gaps.', MARGIN_L, y, CONTENT_W, 4.5);
  }

  y += 6;
  sans(doc, 9);
  color(doc, COLOR_TEXT_SEC);
  y = wrappedText(doc, 'Questions? Book a 30-minute scoping call at lailarallc.com/contact', MARGIN_L, y, CONTENT_W, 4.5);

  return y;
}

// ─── Main export function ─────────────────────────────────────────────────────

/**
 * Generate and download the scorecard PDF.
 * @param {string} brandName
 * @param {string} retailer
 * @param {Object} scores — map of dimension → { status, numeric, findings, fix, hardGate? }
 */
export function exportPdf(brandName, retailer, scores) {
  const retailerLabel = RETAILERS[retailer]?.name ?? retailer;
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const safeName = (brandName || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fileName = `retail-readiness-${safeName}.pdf`;

  const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });
  registerFonts(doc);

  // Page 1
  let y = drawHeader(doc, brandName, retailerLabel, dateStr);
  y = drawVerdictCallout(doc, y, scores, retailer, brandName);
  y = drawBarChart(doc, y, scores);

  // Dimension detail heading
  serif(doc, 13);
  color(doc, COLOR_INK);
  doc.text('What to Address', MARGIN_L, y);
  y += 6;

  // Sort dimensions: reds first (by weight), yellows, greens
  const WEIGHTS = { edi: 5, fulfillment: 5, syndication: 4, productData: 4, financial: 3, compliance: 3, production: 2, team: 2 };
  const sortedDims = [...DIMENSIONS].sort((a, b) => {
    const statOrder = { red: 0, yellow: 1, green: 2 };
    const sa = scores[a]?.status ?? 'green';
    const sb = scores[b]?.status ?? 'green';
    if (statOrder[sa] !== statOrder[sb]) return statOrder[sa] - statOrder[sb];
    return (WEIGHTS[b] ?? 0) - (WEIGHTS[a] ?? 0);
  });

  let pageNum = 1;
  const totalPages = 2; // rough estimate; updated post-render if needed

  addFooter(doc, pageNum, '?', retailerLabel, brandName);

  for (const dim of sortedDims) {
    const newY = drawDimensionCard(doc, y, dim, scores[dim] ?? { status: 'green', numeric: 0, findings: [], fix: '' }, y);
    if (newY === null) {
      // Need a new page
      addPage(doc);
      pageNum++;
      y = MARGIN_T;

      // Re-add header on continuation pages (minimal)
      sans(doc, 8, 'bold');
      color(doc, COLOR_NAVY);
      doc.text('LAILARA', MARGIN_L, y);
      sans(doc, 8);
      color(doc, COLOR_TEXT_SEC);
      doc.text(`${brandName}  ·  ${retailerLabel} Readiness`, MARGIN_L + 12, y);
      y += 8;

      addFooter(doc, pageNum, '?', retailerLabel, brandName);

      const retryY = drawDimensionCard(doc, y, dim, scores[dim], y);
      y = retryY ?? y + 20;
    } else {
      y = newY;
    }
  }

  // Next Steps section
  y = drawNextSteps(doc, y, scores, retailerLabel, brandName);

  // Update page numbers now we know the count
  const finalPageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= finalPageCount; p++) {
    doc.setPage(p);
    // Redraw footer with correct totals
    addFooter(doc, p, finalPageCount, retailerLabel, brandName);
  }

  doc.save(fileName);
}
