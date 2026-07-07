/**
 * Screen renderers — pure functions that return HTML strings.
 *
 * No DOM side-effects here. All state is passed in; all event wiring
 * uses data-action attributes handled by main.js event delegation.
 */

import { RETAILERS } from '../data/retailers.js';
import { getQuestionText, getOptionLabel } from '../data/questions.js';
import { getProgressEstimate } from '../engine/flow.js';
import {
  DIMENSIONS,
  DIMENSION_LABELS,
  getTopBlockers,
  getOverallVerdict,
} from '../engine/scoring.js';
import { buildBarChart } from './chart.js';

// ─── Utility ────────────────────────────────────────────────────────────────

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Shared elements ─────────────────────────────────────────────────────────

function brandMark(subtitle = '') {
  return `
    <div style="margin-bottom: 44px;">
      <div style="font-family: var(--serif); font-size: 13px; font-weight: 700;
                  color: var(--text-secondary); letter-spacing: 0.04em; text-transform: uppercase;
                  margin-bottom: ${subtitle ? '3px' : '0'};">Lailara</div>
      ${subtitle ? `<div style="font-size: 13px; color: var(--text-secondary);">${subtitle}</div>` : ''}
    </div>
  `;
}

// ─── Intro screen ────────────────────────────────────────────────────────────

export function renderIntro() {
  return `
    ${brandMark()}
    <h1 class="screen-title">Are you ready for the buyer's call?</h1>
    <p class="screen-subtitle">
      A diagnostic for specialty food brands. Answer 12–18 questions and get a concrete
      verdict — which requirements you meet, which you don't, and what to fix first.
    </p>
    <div style="margin-bottom: 20px;">
      <button class="btn btn-primary" data-action="start">Start Assessment</button>
    </div>
    <p style="font-size: 13px; color: var(--text-secondary);">
      Takes 5–10 minutes. No sign-up required. All responses stay in your browser.
    </p>
  `;
}

// ─── Retailer selection ──────────────────────────────────────────────────────

const RETAILER_OPTIONS = [
  {
    id: 'walmart',
    label: 'Walmart',
    desc: 'Mass market · Strictest OTIF and EDI requirements',
  },
  {
    id: 'costco',
    label: 'Costco',
    desc: 'Club retail · Appointment-based compliance',
  },
  {
    id: 'wholeFoods',
    label: 'Whole Foods Market',
    desc: 'Natural/specialty · Certification-driven',
  },
];

export function renderRetailerSelect(selectedRetailer) {
  const options = RETAILER_OPTIONS.map(r => `
    <li>
      <button class="option-btn${selectedRetailer === r.id ? ' selected' : ''}"
              data-action="select-retailer"
              data-retailer="${r.id}"
              aria-pressed="${selectedRetailer === r.id}">
        <span class="option-btn__label">${esc(r.label)}</span>
        <span class="option-btn__desc">${esc(r.desc)}</span>
      </button>
    </li>
  `).join('');

  return `
    ${brandMark()}
    <div class="section-label">Step 1 of 3</div>
    <h1 class="screen-title">Which retailer are you assessing for?</h1>
    <p class="screen-subtitle">
      Each retailer has distinct requirements. Select the one you're targeting —
      you can run this assessment again for others.
    </p>
    <ul class="options-list" aria-label="Retailer options">
      ${options}
    </ul>
    <div class="action-row">
      <button class="btn btn-primary" data-action="continue-retailer"
              ${!selectedRetailer ? 'disabled' : ''}>
        Continue
      </button>
    </div>
  `;
}

// ─── Brand name ──────────────────────────────────────────────────────────────

export function renderBrandName(brandName, retailer) {
  const retailerLabel = RETAILERS[retailer]?.name ?? '';

  return `
    ${brandMark(retailerLabel ? `Readiness Assessment — ${retailerLabel}` : '')}
    <button class="back-link" data-action="back">← Back</button>
    <div class="section-label">Step 2 of 3</div>
    <h1 class="screen-title">What's your brand name?</h1>
    <p class="screen-subtitle">
      Used throughout your scorecard to personalize the report.
    </p>
    <div>
      <input class="text-input" type="text" name="brand-name"
             value="${esc(brandName)}"
             placeholder="e.g. Sunrise Foods"
             autocomplete="off"
             spellcheck="false"
             autofocus />
      <p class="input-hint">Press Enter or click Continue when ready.</p>
    </div>
    <div class="action-row">
      <button class="btn btn-primary" data-action="continue-brand">Continue</button>
    </div>
  `;
}

// ─── Question screen ─────────────────────────────────────────────────────────

export function renderQuestion(question, flowState, retailer, brandName) {
  const { current, estimated } = getProgressEstimate(flowState);
  const questionText = getQuestionText(question, retailer);
  const retailerLabel = RETAILERS[retailer]?.name ?? '';

  const options = question.options.map(opt => {
    const label = getOptionLabel(opt, retailer);
    return `
      <li>
        <button class="option-btn"
                data-action="answer"
                data-question-id="${esc(question.id)}"
                data-value="${esc(opt.value)}">
          <span class="option-btn__label">${esc(label)}</span>
        </button>
      </li>
    `;
  }).join('');

  const contextLine = brandName
    ? `${esc(brandName)} · ${esc(retailerLabel)}`
    : esc(retailerLabel);

  return `
    ${brandMark(contextLine)}
    <div style="display: flex; justify-content: space-between; align-items: center;
                flex-wrap: wrap; gap: 8px; margin-bottom: 32px;">
      <button class="back-link" style="margin-bottom: 0;" data-action="back">← Back</button>
      <span class="progress-indicator" style="margin-bottom: 0;">
        Question ${current} of ~${estimated}
      </span>
    </div>
    <p class="question-text">${esc(questionText)}</p>
    <ul class="options-list" aria-label="Answer options">
      ${options}
    </ul>
  `;
}

// ─── Results screen ──────────────────────────────────────────────────────────

const STATUS_LABELS = { red: 'Red', yellow: 'Yellow', green: 'Green' };

const DIMENSION_ENGAGEMENTS = {
  productData: { name: 'Product Data Health Audit', path: '/work/product-data-health-audit' },
  syndication: { name: 'Product Data Health Audit', path: '/work/product-data-health-audit' },
  edi:         { name: 'Retail Readiness & Launch', path: '/work/retail-readiness-launch' },
  fulfillment: { name: 'Fulfillment & OTIF Diagnostic', path: '/work/fulfillment-otif' },
  financial:   { name: 'Retail Readiness & Launch', path: '/work/retail-readiness-launch' },
  production:  { name: 'Fulfillment & OTIF Diagnostic', path: '/work/fulfillment-otif' },
  compliance:  { name: 'Retail Readiness & Launch', path: '/work/retail-readiness-launch' },
  team:        { name: 'Trade Spend & Deduction Recovery', path: '/work/trade-spend-deduction-recovery' },
};

/**
 * @param {string} brandName
 * @param {string} retailer
 * @param {Object} scores — map of dimension → { status, numeric, findings, fix, hardGate? }
 */
export function renderResults(brandName, retailer, scores) {
  const retailerLabel = RETAILERS[retailer]?.name ?? retailer;
  const { verdict, timeline, overallStatus } = getOverallVerdict(scores, retailer);
  const topBlockers = getTopBlockers(scores);

  // ── Callout card ──────────────────────────────────────────────────────────

  const blockerItems = topBlockers.map(dim => {
    const s = scores[dim];
    const label = DIMENSION_LABELS[dim] ?? dim;
    const finding = s.findings?.[0]
      ?? (s.status === 'green' ? 'No critical gaps identified.' : 'Review dimension detail below.');
    return `
      <li class="callout-card__blocker">
        <span class="blocker-chip ${s.status}" aria-hidden="true"></span>
        <div class="callout-card__blocker-text">
          <strong>${esc(label)}</strong>
          ${esc(finding)}
        </div>
      </li>
    `;
  }).join('');

  const calloutCard = `
    <div class="callout-card" role="region" aria-label="Overall verdict">
      <p class="callout-card__label">Lailara — Retail Readiness Scorecard</p>
      <p class="callout-card__verdict">${esc(verdict)}</p>
      <p class="callout-card__brand">${esc(brandName)} · ${esc(retailerLabel)}</p>

      <p class="callout-card__blockers-heading">Top Priorities</p>
      <ul class="callout-card__blockers" aria-label="Top priorities">
        ${blockerItems}
      </ul>

      <p class="callout-card__timeline">${esc(timeline)}</p>
    </div>
  `;

  // ── Bar chart ─────────────────────────────────────────────────────────────

  const chartSection = `
    <div class="results-section">
      <h2 class="results-section-title">Scorecard by Dimension</h2>
      <div class="results-chart-wrap">
        ${buildBarChart(scores)}
      </div>
      <p style="font-size: 11px; color: var(--text-secondary); font-style: italic; margin-top: 6px; padding: 0 4px;">
        Scores weighted by retailer requirement severity.
        Red &lt;30 · Yellow 30–69 · Green ≥70.
      </p>
    </div>
  `;

  // ── Dimension detail cards ────────────────────────────────────────────────

  // Sort: reds (by weight), then yellows, then greens — same priority as blockers
  const sortedDimensions = [...DIMENSIONS].sort((a, b) => {
    const statOrder = { red: 0, yellow: 1, green: 2 };
    const sa = scores[a]?.status ?? 'green';
    const sb = scores[b]?.status ?? 'green';
    if (statOrder[sa] !== statOrder[sb]) return statOrder[sa] - statOrder[sb];
    // Same status: sort by weight desc
    const wa = { edi: 5, fulfillment: 5, syndication: 4, productData: 4, financial: 3, compliance: 3, production: 2, team: 2 };
    return (wa[b] ?? 0) - (wa[a] ?? 0);
  });

  const dimensionCards = sortedDimensions.map(dim => {
    const s = scores[dim];
    const label = DIMENSION_LABELS[dim] ?? dim;
    const findingItems = (s.findings ?? []).map(f => `<li>${esc(f)}</li>`).join('');
    const hardGateNote = s.hardGate
      ? `<p style="font-size:12px;color:var(--status-red);font-weight:600;margin-top:8px;">⚠ Hard gate — no conditional path forward without resolving this.</p>`
      : '';

    return `
      <div class="dimension-card ${s.status}" role="article" aria-label="${esc(label)}: ${s.status}">
        <div class="dimension-card__header">
          <span class="dimension-card__name">${esc(label)}</span>
          <span class="status-badge ${s.status}">${STATUS_LABELS[s.status]} · ${s.numeric}%</span>
        </div>
        ${findingItems
          ? `<ul class="dimension-card__findings" aria-label="Findings">${findingItems}</ul>`
          : `<p style="font-size:14px;color:var(--text-secondary);">No critical gaps identified.</p>`
        }
        ${s.fix && (s.findings?.length > 0 || s.status !== 'green')
          ? `<p class="dimension-card__fix">${esc(s.fix)}</p>`
          : ''}
        ${hardGateNote}
      </div>
    `;
  }).join('');

  const detailSection = `
    <div class="results-section">
      <h2 class="results-section-title">What to Address</h2>
      <div class="dimension-grid">
        ${dimensionCards}
      </div>
    </div>
  `;

  // ── Next steps (Red-dimension routing) ─────────────────────────────────

  const redDimensions = DIMENSIONS.filter(d => scores[d]?.status === 'red');
  const seen = new Set();
  const dedupedLinks = redDimensions
    .map(d => ({ dim: d, ...DIMENSION_ENGAGEMENTS[d] }))
    .filter(item => {
      if (seen.has(item.path)) return false;
      seen.add(item.path);
      return true;
    });

  let nextStepsSection;
  if (dedupedLinks.length > 0) {
    const linkItems = dedupedLinks.map(item => {
      const dimLabel = DIMENSION_LABELS[item.dim] ?? item.dim;
      return `
        <li style="display: flex; align-items: baseline; gap: 8px; padding: 10px 0;
                    border-bottom: 1px solid var(--border-subtle, #e0e0e0);">
          <span class="blocker-chip red" aria-hidden="true" style="flex-shrink: 0;"></span>
          <div>
            <strong style="color: var(--ink);">${esc(dimLabel)}</strong>
            <a href="${item.path}" target="_top"
               style="display: block; font-size: 14px; color: var(--accent, #1f2e7a);
                      text-decoration: underline; margin-top: 2px;">
              ${esc(item.name)} &rarr;
            </a>
          </div>
        </li>
      `;
    }).join('');

    nextStepsSection = `
      <div class="results-section" style="margin-top: 32px;">
        <h2 class="results-section-title">Next Steps</h2>
        <p style="font-size: 15px; color: var(--text-secondary); margin-bottom: 12px;">
          Each Red dimension has a scoped engagement that addresses it. These are the ones that matter for your launch.
        </p>
        <ul style="list-style: none; padding: 0; margin: 0;">${linkItems}</ul>
      </div>
    `;
  } else {
    nextStepsSection = `
      <div class="results-section" style="margin-top: 32px;">
        <h2 class="results-section-title">Looking Good</h2>
        <p style="font-size: 15px; color: var(--text-secondary); margin-bottom: 12px;">
          No Red dimensions — you're ahead of most brands at this stage. If you want a second
          opinion on the Yellows or help tightening the gaps before the buyer's call:
        </p>
        <a href="/contact" target="_top"
           style="display: inline-block; padding: 8px 20px; background: var(--accent, #1f2e7a);
                  color: #fff; font-size: 14px; font-weight: 600; text-decoration: none;
                  border-radius: 2px;">
          Get in Touch &rarr;
        </a>
      </div>
    `;
  }

  // ── Action row ────────────────────────────────────────────────────────────

  const actions = `
    <div class="action-row" style="margin-top: 40px; padding-bottom: 40px;">
      <button class="btn btn-primary" data-action="export-pdf">Export PDF</button>
      <button class="btn btn-secondary" data-action="restart">Start Over</button>
    </div>
  `;

  return `
    ${brandMark(`${esc(retailerLabel)} Readiness — ${esc(brandName)}`)}
    <div class="section-label">Assessment complete</div>
    <h1 class="screen-title">${esc(verdict)}</h1>
    ${calloutCard}
    ${chartSection}
    ${detailSection}
    ${nextStepsSection}
    ${actions}
  `;
}

// Keep the stub export for backwards-compat during transition
export function renderResultsStub() {
  return renderResults('Your Brand', 'walmart', {
    productData: { status: 'yellow', numeric: 57, findings: [], fix: '' },
    syndication: { status: 'green',  numeric: 80, findings: [], fix: '' },
    edi:         { status: 'red',    numeric: 0,  findings: ['No EDI capability.'], fix: 'Implement EDI.' },
    fulfillment: { status: 'yellow', numeric: 33, findings: [], fix: '' },
    financial:   { status: 'green',  numeric: 100,findings: [], fix: '' },
    production:  { status: 'green',  numeric: 80, findings: [], fix: '' },
    compliance:  { status: 'green',  numeric: 100,findings: [], fix: '' },
    team:        { status: 'red',    numeric: 0,  findings: ['No named owner.'], fix: 'Assign owner.' },
  });
}
