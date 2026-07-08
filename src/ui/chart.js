/**
 * chart.js — SVG horizontal bar chart for the 8-dimension scorecard.
 *
 * Returns an SVG string. Pure function, no DOM side-effects.
 */

import { DIMENSIONS, DIMENSION_LABELS, DIMENSION_WEIGHTS } from '../engine/scoring.js';

// Bar fills use graded data colors. Brand red #cc100a is ink-only, never a bar
// fill (Lailara design system), so red bars use Red-20 and yellow uses New York
// amber — not darkgoldenrod.
const BAR_FILL = {
  red:    '#8e0b07',  // Red-20
  yellow: '#d4a518',  // New York-45 (amber)
  green:  '#158f75',  // Hong Kong-35
};

// Status is carried in the percentage label ink (higher-contrast steps).
const STATUS_INK = {
  red:    '#cc100a',  // Red-42 (brand ink)
  yellow: '#a88312',  // New York-35 (dark gold)
  green:  '#158f75',  // Hong Kong-35
};

const LABEL_COL_W = 178;  // px — dimension label area
const BAR_START   = 188;  // bar left edge
const BAR_MAX_W   = 340;  // max bar width at 100%
const PCT_COL_X   = BAR_START + BAR_MAX_W + 8;  // percentage label x
const ROW_H       = 36;   // height per dimension row
const BAR_H       = 18;   // bar height
const TOTAL_W     = 600;
const TOTAL_H     = DIMENSIONS.length * ROW_H + 8;

/**
 * Build the SVG bar chart.
 * @param {Object} scores — map of dimension → { status, numeric, ... }
 * @returns {string} SVG markup
 */
export function buildBarChart(scores) {
  const rows = DIMENSIONS.map((dim, i) => {
    const score = scores[dim] ?? { status: 'red', numeric: 0 };
    const y = i * ROW_H + 4;
    const barW = Math.round((score.numeric / 100) * BAR_MAX_W);
    const fillColor = BAR_FILL[score.status] ?? BAR_FILL.red;
    const inkColor  = STATUS_INK[score.status] ?? STATUS_INK.red;
    const label = DIMENSION_LABELS[dim] ?? dim;
    const pct = `${score.numeric}%`;

    // Center text vertically within row
    const textY = y + ROW_H / 2;
    const barY  = y + (ROW_H - BAR_H) / 2;

    return `
      <g role="row" aria-label="${label}: ${pct} ${score.status}">
        <!-- Label -->
        <text x="${LABEL_COL_W}" y="${textY}" text-anchor="end"
              font-family="'Source Sans 3', 'Source Sans Pro', Helvetica, Arial, sans-serif"
              font-size="13" fill="#595959" dominant-baseline="middle"
              clip-path="url(#label-clip)">${escSvg(label)}</text>

        <!-- Bar track -->
        <rect x="${BAR_START}" y="${barY}" width="${BAR_MAX_W}" height="${BAR_H}"
              rx="1" fill="#f2f2f2" />

        <!-- Bar fill -->
        ${barW > 0 ? `<rect x="${BAR_START}" y="${barY}" width="${barW}" height="${BAR_H}"
              rx="1" fill="${fillColor}" />` : ''}

        <!-- Percentage -->
        <text x="${PCT_COL_X}" y="${textY}" text-anchor="start"
              font-family="'Source Sans 3', 'Source Sans Pro', Helvetica, Arial, sans-serif"
              font-size="12" fill="${inkColor}" font-weight="600"
              dominant-baseline="middle">${escSvg(pct)}</text>
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${TOTAL_W} ${TOTAL_H}"
         role="img"
         aria-label="Retail readiness scorecard by dimension"
         style="width:100%; max-width:${TOTAL_W}px; display:block;">
      <defs>
        <clipPath id="label-clip">
          <rect x="0" y="0" width="${LABEL_COL_W}" height="${TOTAL_H}" />
        </clipPath>
      </defs>
      ${rows}
    </svg>
  `;
}

function escSvg(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
