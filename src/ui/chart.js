/**
 * chart.js — SVG horizontal bar chart for the 8-dimension scorecard.
 *
 * Returns an SVG string. Pure function, no DOM side-effects.
 */

import { DIMENSIONS, DIMENSION_LABELS, DIMENSION_WEIGHTS } from '../engine/scoring.js';

const STATUS_COLORS = {
  red:    '#cc100a',
  yellow: '#b8860b',
  green:  '#158f75',
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
    const color = STATUS_COLORS[score.status] ?? STATUS_COLORS.red;
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
              rx="1" fill="#f0f0eb" />

        <!-- Bar fill -->
        ${barW > 0 ? `<rect x="${BAR_START}" y="${barY}" width="${barW}" height="${BAR_H}"
              rx="1" fill="${color}" />` : ''}

        <!-- Percentage -->
        <text x="${PCT_COL_X}" y="${textY}" text-anchor="start"
              font-family="'Source Sans 3', 'Source Sans Pro', Helvetica, Arial, sans-serif"
              font-size="12" fill="${color}" font-weight="600"
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
