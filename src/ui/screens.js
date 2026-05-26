/**
 * Screen renderers — pure functions that return HTML strings.
 *
 * No DOM side-effects here. All state is passed in; all event wiring
 * uses data-action attributes handled by main.js event delegation.
 */

import { RETAILERS } from '../data/retailers.js';
import { getQuestionText, getOptionLabel } from '../data/questions.js';
import { getProgressEstimate } from '../engine/flow.js';

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

// ─── Results placeholder (U6) ────────────────────────────────────────────────

export function renderResultsStub() {
  return `
    ${brandMark()}
    <p class="section-label">Assessment complete</p>
    <h1 class="screen-title">Calculating your scorecard…</h1>
    <p class="screen-subtitle">Full results will appear here in the next build.</p>
  `;
}
