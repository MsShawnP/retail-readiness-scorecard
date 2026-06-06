/**
 * main.js — app entry point.
 *
 * Manages top-level app state, screen transitions, and event delegation.
 * All screen rendering is delegated to src/ui/screens.js.
 * All question flow logic is delegated to src/engine/flow.js.
 */

import './fonts.css';
import './styles/variables.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/progress.css';

import {
  initFlow,
  getNextQuestion,
  answerQuestion,
  undoLastAnswer,
  isComplete,
} from './engine/flow.js';

import {
  renderIntro,
  renderRetailerSelect,
  renderBrandName,
  renderQuestion,
  renderResults,
} from './ui/screens.js';
import { computeScores } from './engine/scoring.js';
import { exportPdf } from './ui/pdf.js';

// ─── App state ───────────────────────────────────────────────────────────────

/**
 * @type {{
 *   phase: string,
 *   retailer: string|null,
 *   brandName: string,
 *   flowState: object|null,
 *   scores: object|null,
 * }}
 */
const isEmbedded = new URLSearchParams(window.location.search).has('embedded');

let appState = {
  phase: isEmbedded ? 'retailer' : 'intro',
  retailer: null,
  brandName: '',
  flowState: null,
  scores: null,
};

// ─── Transitions ─────────────────────────────────────────────────────────────

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Mount new screen HTML into #app.
 * CSS @keyframes screen-fade-in handles the fade automatically on every mount.
 */
function mountScreen(html) {
  const app = document.getElementById('app');
  const screen = document.createElement('div');
  screen.className = 'screen';
  screen.innerHTML = html;
  app.innerHTML = '';
  app.appendChild(screen);
}

/**
 * Transition to a new screen.
 * Small delay before mount gives the exit a moment to breathe.
 */
function transitionTo(html) {
  const app = document.getElementById('app');
  const current = app.querySelector('.screen');

  if (!current || prefersReducedMotion()) {
    mountScreen(html);
    return;
  }

  // Brief pause — lets the user see the click register before content swaps
  setTimeout(() => mountScreen(html), 80);
}

// ─── Render ──────────────────────────────────────────────────────────────────

function render() {
  const { phase, retailer, brandName, flowState } = appState;

  switch (phase) {
    case 'intro':
      transitionTo(renderIntro());
      break;

    case 'retailer':
      transitionTo(renderRetailerSelect(retailer));
      break;

    case 'brand':
      transitionTo(renderBrandName(brandName, retailer));
      break;

    case 'questions': {
      if (!flowState || isComplete(flowState)) {
        appState = { ...appState, phase: 'results' };
        render();
        return;
      }
      const q = getNextQuestion(flowState);
      if (!q) {
        appState = { ...appState, phase: 'results' };
        render();
        return;
      }
      transitionTo(renderQuestion(q, flowState, retailer, brandName));
      break;
    }

    case 'results': {
      // Compute scores lazily (only once)
      if (!appState.scores) {
        appState = {
          ...appState,
          scores: computeScores(flowState?.answers ?? {}, retailer),
        };
      }
      transitionTo(renderResults(brandName, retailer, appState.scores));
      break;
    }
  }
}

// ─── Event delegation ─────────────────────────────────────────────────────────

function handleClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;

  switch (action) {
    // ── Intro ──
    case 'start':
      appState = { ...appState, phase: 'retailer' };
      render();
      break;

    // ── Retailer selection ──
    case 'select-retailer': {
      const retailer = btn.dataset.retailer;
      if (!retailer) return;

      appState = { ...appState, retailer };

      // Update selection visuals without full re-render
      document.querySelectorAll('[data-action="select-retailer"]').forEach(b => {
        const isSelected = b.dataset.retailer === retailer;
        b.classList.toggle('selected', isSelected);
        b.setAttribute('aria-pressed', String(isSelected));
      });
      const continueBtn = document.querySelector('[data-action="continue-retailer"]');
      if (continueBtn) continueBtn.removeAttribute('disabled');
      break;
    }

    case 'continue-retailer':
      if (!appState.retailer) return;
      appState = { ...appState, phase: 'brand' };
      render();
      break;

    // ── Brand name ──
    case 'continue-brand': {
      const input = document.querySelector('input[name="brand-name"]');
      const name = input?.value.trim() || '';
      const brandName = name || 'Your Brand';
      appState = {
        ...appState,
        brandName,
        phase: 'questions',
        flowState: initFlow(appState.retailer, brandName),
      };
      render();
      break;
    }

    // ── Answer a question ──
    case 'answer': {
      const value = btn.dataset.value;
      const questionId = btn.dataset.questionId;
      if (!value || !questionId || !appState.flowState) return;

      // Visual feedback: mark selected, disable all options briefly
      const optionBtns = document.querySelectorAll('[data-action="answer"]');
      optionBtns.forEach(b => {
        b.disabled = true;
        b.classList.toggle('selected', b === btn);
      });

      // Advance state after brief pause for visual feedback
      setTimeout(() => {
        const newFlowState = answerQuestion(appState.flowState, questionId, value);
        appState = { ...appState, flowState: newFlowState };
        if (isComplete(newFlowState)) {
          appState = { ...appState, phase: 'results' };
        }
        render();
      }, 160);
      break;
    }

    // ── Results actions ──
    case 'restart':
      appState = { phase: 'intro', retailer: null, brandName: '', flowState: null, scores: null };
      render();
      break;

    case 'export-pdf':
      if (appState.scores && appState.retailer) {
        exportPdf(appState.brandName || 'Your Brand', appState.retailer, appState.scores);
      }
      break;

    // ── Back navigation ──
    case 'back': {
      const { phase, flowState } = appState;

      if (phase === 'questions' && flowState && flowState.history.length > 0) {
        // Undo last answer → re-show previous question
        appState = { ...appState, flowState: undoLastAnswer(flowState) };
        render();
      } else if (phase === 'questions') {
        // First question → back to brand name
        appState = { ...appState, phase: 'brand', flowState: null };
        render();
      } else if (phase === 'brand') {
        appState = { ...appState, phase: 'retailer' };
        render();
      } else if (phase === 'retailer') {
        appState = { ...appState, phase: 'intro' };
        render();
      }
      break;
    }
  }
}

function handleKeydown(e) {
  // Enter on brand name input triggers Continue
  if (e.key === 'Enter' && e.target.matches('input[name="brand-name"]')) {
    document.querySelector('[data-action="continue-brand"]')?.click();
  }
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

// Guard against HMR re-execution re-adding listeners and re-initializing state
const APP_INIT_KEY = '__rrs_initialized';
if (!window[APP_INIT_KEY]) {
  window[APP_INIT_KEY] = true;
  document.getElementById('app').addEventListener('click', handleClick);
  document.getElementById('app').addEventListener('keydown', handleKeydown);
  render();
}

// HMR: on module update, remove the guard so the next full reload reinitializes cleanly
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window[APP_INIT_KEY] = false;
  });
  import.meta.hot.accept();
}
