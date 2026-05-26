/**
 * Flow engine — adaptive question sequencing state machine.
 *
 * Pure functions. No DOM. No side effects.
 *
 * State shape:
 * {
 *   retailer: string,
 *   brandName: string,
 *   answers: { [questionId]: 'yes'|'partial'|'no' },
 *   history: string[],         // ordered list of question IDs seen
 *   completedDimensions: Set<string>,  // dimensions already scored (via gate or completion)
 *   scores: { [dimension]: object },   // computed as dimensions complete
 *   phase: 'intro'|'retailer'|'brand'|'questions'|'results',
 * }
 */

import { DIMENSIONS } from './scoring.js';
import { QUESTIONS, getQuestionsForRetailer } from '../data/questions.js';

// Dimension display order (same as DIMENSIONS array, controls question sequencing)
const DIMENSION_ORDER = DIMENSIONS;

// For Whole Foods, float comp_ingredients to front of compliance dimension
const WFM_COMPLIANCE_FIRST = 'comp_ingredients';

/**
 * Create initial flow state.
 * @param {string} retailer
 * @param {string} brandName
 * @returns {Object} initial state
 */
export function initFlow(retailer, brandName) {
  return {
    retailer,
    brandName: brandName || 'Your Brand',
    answers: {},
    history: [],
    completedDimensions: new Set(),
    scores: {},
    phase: 'questions',
  };
}

/**
 * Get the ordered list of questions for this retailer, respecting:
 * - Dimension order (DIMENSION_ORDER)
 * - Within-dimension order (question.order)
 * - WFM compliance: comp_ingredients floated first
 * @param {string} retailer
 * @returns {Array} ordered questions
 */
function getOrderedQuestions(retailer) {
  const applicable = QUESTIONS.filter(q => q.retailers.includes(retailer));

  // Group by dimension
  const byDimension = {};
  for (const dim of DIMENSION_ORDER) {
    byDimension[dim] = applicable
      .filter(q => q.dimension === dim)
      .sort((a, b) => a.order - b.order);
  }

  // For WFM, ensure comp_ingredients is first in compliance
  if (retailer === 'wholeFoods' && byDimension.compliance) {
    const firstIdx = byDimension.compliance.findIndex(q => q.id === WFM_COMPLIANCE_FIRST);
    if (firstIdx > 0) {
      const [gate] = byDimension.compliance.splice(firstIdx, 1);
      byDimension.compliance.unshift(gate);
    }
  }

  // Flatten in dimension order
  return DIMENSION_ORDER.flatMap(dim => byDimension[dim] || []);
}

/**
 * Get the next question to show, or null if assessment is complete.
 *
 * Skips:
 * - Questions for completed dimensions
 * - Questions the user has already answered
 *
 * @param {Object} state
 * @returns {Object|null} question object, or null if done
 */
export function getNextQuestion(state) {
  const ordered = getOrderedQuestions(state.retailer);

  for (const question of ordered) {
    // Skip if dimension already completed (gate fired or all answered)
    if (state.completedDimensions.has(question.dimension)) continue;

    // Skip if already answered
    if (state.answers[question.id] !== undefined) continue;

    return question;
  }

  return null; // All questions answered or skipped
}

/**
 * Record an answer and update state.
 *
 * If the answer triggers a gate:
 * - For standard gates (redGateValues includes the answer): mark dimension completed,
 *   store a gate score of { status:'red', numeric:0, gateTriggered:true }
 * - For WFM comp_ingredients gate ('yes' = prohibited found): same behavior
 *
 * If the answer completes a dimension (all non-skipped questions answered):
 * - Mark dimension complete; scoring happens in computeScores() at results time
 *
 * @param {Object} state
 * @param {string} questionId
 * @param {string} value — 'yes'|'partial'|'no'
 * @returns {Object} new state (does not mutate input)
 */
export function answerQuestion(state, questionId, value) {
  const question = QUESTIONS.find(q => q.id === questionId);
  if (!question) throw new Error(`Unknown question: ${questionId}`);

  const newAnswers = { ...state.answers, [questionId]: value };
  const newHistory = [...state.history, questionId];
  const newCompleted = new Set(state.completedDimensions);

  // Check if this answer triggers a gate
  const isGateTrigger = question.isGate && question.redGateValues.includes(value);

  if (isGateTrigger) {
    newCompleted.add(question.dimension);
  } else {
    // Check if all questions for this dimension are now answered (no gate triggered)
    const dimQuestions = QUESTIONS.filter(
      q => q.dimension === question.dimension && q.retailers.includes(state.retailer)
    );
    const allAnswered = dimQuestions.every(q => newAnswers[q.id] !== undefined);
    if (allAnswered) {
      newCompleted.add(question.dimension);
    }
  }

  return {
    ...state,
    answers: newAnswers,
    history: newHistory,
    completedDimensions: newCompleted,
  };
}

/**
 * Undo the last answer and return to the previous state.
 * @param {Object} state
 * @returns {Object} state with last answer removed
 */
export function undoLastAnswer(state) {
  if (state.history.length === 0) return state;

  const newHistory = [...state.history];
  const lastId = newHistory.pop();
  const newAnswers = { ...state.answers };
  delete newAnswers[lastId];

  // Recompute completed dimensions from remaining answers
  const newCompleted = new Set();
  for (const dim of DIMENSION_ORDER) {
    const dimQuestions = QUESTIONS.filter(
      q => q.dimension === dim && q.retailers.includes(state.retailer)
    );
    // Dimension is complete if a gate was triggered in remaining answers
    const gateTriggered = dimQuestions.some(
      q => q.isGate && q.redGateValues.includes(newAnswers[q.id])
    );
    if (gateTriggered) {
      newCompleted.add(dim);
      continue;
    }
    // Or if all questions are answered
    const allAnswered = dimQuestions.length > 0 && dimQuestions.every(q => newAnswers[q.id] !== undefined);
    if (allAnswered) newCompleted.add(dim);
  }

  return {
    ...state,
    answers: newAnswers,
    history: newHistory,
    completedDimensions: newCompleted,
  };
}

/**
 * Check if the assessment is complete (all 8 dimensions have scores or are gated).
 * @param {Object} state
 * @returns {boolean}
 */
export function isComplete(state) {
  return getNextQuestion(state) === null;
}

/**
 * Get an estimate of total questions remaining (for progress display).
 * Shows current position and a rough total based on non-completed dimensions.
 * @param {Object} state
 * @returns {{ current: number, estimated: number }}
 */
export function getProgressEstimate(state) {
  const current = state.history.length + 1;
  const remaining = getOrderedQuestions(state.retailer).filter(
    q => !state.completedDimensions.has(q.dimension) && state.answers[q.id] === undefined
  ).length;
  const estimated = state.history.length + remaining;
  return { current, estimated };
}
