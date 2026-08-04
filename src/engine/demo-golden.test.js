import { describe, it, expect } from 'vitest';
import { computeScores, getTopBlockers, getOverallVerdict, DIMENSIONS } from './scoring.js';

/**
 * Demo golden-file lock.
 *
 * Pins the JavaScript engine's SUBSTANTIVE output (per-dimension status + numeric
 * + hardGate, top blockers, verdict, remediation timeline, overall status) for a
 * representative set of answer-sets across all three retailers. The JS engine is
 * canonical and drives the live site; if any value below changes, the deployed
 * scorecard changed — this test makes that impossible to do silently.
 *
 * It also anchors the Python-mirror parity work: these are the exact outputs the
 * Python engine must reproduce (see scoring_engine/test_parity.py).
 *
 * Coverage: an all-ready Walmart profile; a not-ready Walmart profile exercising
 * the FSMA-204 red gate, the Item 360 cap-at-yellow, and a partial-OTIF red; a
 * Costco profile exercising the direct-thermal cap and two gate reds; the Whole
 * Foods prohibited-ingredient hard gate; and a Whole Foods GFSI hard gate with a
 * mixed remainder.
 */

// Normalize a full scoring run to the cross-engine-comparable shape.
function score(retailer, answers) {
  const scores = computeScores(answers, retailer);
  const dimensions = {};
  for (const d of DIMENSIONS) {
    dimensions[d] = {
      status: scores[d].status,
      numeric: scores[d].numeric,
      hardGate: Boolean(scores[d].hardGate),
    };
  }
  const v = getOverallVerdict(scores, retailer);
  return {
    dimensions,
    topBlockers: getTopBlockers(scores),
    verdict: v.verdict,
    timeline: v.timeline,
    overallStatus: v.overallStatus,
  };
}

const CASES = [
  {
    name: 'walmart — all ready',
    retailer: 'walmart',
    answers: {
      pd_gtin_valid: 'yes', pd_hierarchy: 'yes', pd_item360: 'yes',
      syn_gdsn_active: 'yes', syn_coverage: 'yes',
      edi_asn_capable: 'yes', edi_asn_timing: 'yes', edi_fsma204: 'yes', edi_label_compliant: 'yes',
      ff_otif_rate: 'yes',
      fin_cost_modeled: 'yes', fin_cash_runway: 'yes',
      prod_capacity_confirmed: 'yes', prod_lead_time: 'yes',
      comp_fsma_pcqi: 'yes', comp_allergens: 'yes',
      team_owner: 'yes', team_chargeback_process: 'yes',
    },
    expected: {
      dimensions: {
        productData: { status: 'green', numeric: 100, hardGate: false },
        syndication: { status: 'green', numeric: 100, hardGate: false },
        edi: { status: 'green', numeric: 100, hardGate: false },
        fulfillment: { status: 'green', numeric: 100, hardGate: false },
        financial: { status: 'green', numeric: 100, hardGate: false },
        production: { status: 'green', numeric: 100, hardGate: false },
        compliance: { status: 'green', numeric: 100, hardGate: false },
        team: { status: 'green', numeric: 100, hardGate: false },
      },
      topBlockers: [],
      verdict: 'Ready for Walmart',
      timeline: 'No critical blockers identified.',
      overallStatus: 'ready',
    },
  },
  {
    name: 'walmart — FSMA-204 gate + Item 360 cap + partial OTIF',
    retailer: 'walmart',
    answers: {
      pd_gtin_valid: 'yes', pd_hierarchy: 'partial', pd_item360: 'no',
      syn_gdsn_active: 'yes', syn_coverage: 'partial',
      edi_asn_capable: 'yes', edi_asn_timing: 'partial', edi_fsma204: 'no', edi_label_compliant: 'yes',
      ff_otif_rate: 'partial',
      fin_cost_modeled: 'yes', fin_cash_runway: 'no',
      prod_capacity_confirmed: 'yes', prod_lead_time: 'yes',
      comp_fsma_pcqi: 'yes', comp_allergens: 'partial',
      team_owner: 'yes', team_chargeback_process: 'partial',
    },
    expected: {
      dimensions: {
        productData: { status: 'yellow', numeric: 57, hardGate: false },
        syndication: { status: 'green', numeric: 80, hardGate: false },
        edi: { status: 'red', numeric: 0, hardGate: false },
        fulfillment: { status: 'red', numeric: 33, hardGate: false },
        financial: { status: 'yellow', numeric: 60, hardGate: false },
        production: { status: 'green', numeric: 100, hardGate: false },
        compliance: { status: 'green', numeric: 80, hardGate: false },
        team: { status: 'green', numeric: 80, hardGate: false },
      },
      topBlockers: ['edi', 'fulfillment', 'productData'],
      verdict: 'Not Ready for Walmart Launch',
      timeline: 'Estimated 12–20 weeks to close these gaps.',
      overallStatus: 'not-ready',
    },
  },
  {
    name: 'costco — direct-thermal cap + capacity/team gate reds',
    retailer: 'costco',
    answers: {
      pd_gtin_valid: 'yes', pd_hierarchy: 'yes',
      syn_gdsn_active: 'partial', syn_coverage: 'partial',
      edi_asn_capable: 'yes', edi_asn_timing: 'yes', edi_label_compliant: 'yes',
      ff_otif_rate: 'yes', ff_thermal: 'no',
      fin_cost_modeled: 'partial', fin_cash_runway: 'partial',
      prod_capacity_confirmed: 'no', prod_lead_time: 'yes',
      comp_fsma_pcqi: 'yes', comp_allergens: 'yes',
      team_owner: 'partial', team_chargeback_process: 'no',
    },
    expected: {
      dimensions: {
        productData: { status: 'green', numeric: 100, hardGate: false },
        syndication: { status: 'yellow', numeric: 40, hardGate: false },
        edi: { status: 'green', numeric: 100, hardGate: false },
        fulfillment: { status: 'yellow', numeric: 75, hardGate: false },
        financial: { status: 'yellow', numeric: 40, hardGate: false },
        production: { status: 'red', numeric: 0, hardGate: false },
        compliance: { status: 'green', numeric: 100, hardGate: false },
        team: { status: 'red', numeric: 20, hardGate: false },
      },
      topBlockers: ['production', 'team', 'fulfillment'],
      verdict: 'Not Ready for Costco Launch',
      timeline: 'Estimated 5–10 weeks to close these gaps.',
      overallStatus: 'not-ready',
    },
  },
  {
    name: 'wholeFoods — prohibited-ingredient hard gate',
    retailer: 'wholeFoods',
    answers: {
      pd_gtin_valid: 'yes', pd_hierarchy: 'yes',
      syn_gdsn_active: 'yes', syn_coverage: 'yes',
      edi_asn_capable: 'yes', edi_asn_timing: 'yes', edi_label_compliant: 'yes',
      ff_otif_rate: 'yes',
      fin_cost_modeled: 'yes', fin_cash_runway: 'yes',
      prod_capacity_confirmed: 'yes', prod_lead_time: 'yes',
      comp_ingredients: 'yes', comp_fsma_pcqi: 'yes', comp_gfsi_cert: 'yes', comp_allergens: 'yes',
      team_owner: 'yes', team_chargeback_process: 'yes',
    },
    expected: {
      dimensions: {
        productData: { status: 'green', numeric: 100, hardGate: false },
        syndication: { status: 'green', numeric: 100, hardGate: false },
        edi: { status: 'green', numeric: 100, hardGate: false },
        fulfillment: { status: 'green', numeric: 100, hardGate: false },
        financial: { status: 'green', numeric: 100, hardGate: false },
        production: { status: 'green', numeric: 100, hardGate: false },
        compliance: { status: 'red', numeric: 0, hardGate: true },
        team: { status: 'green', numeric: 100, hardGate: false },
      },
      topBlockers: ['compliance'],
      verdict: 'Not Ready for Whole Foods Launch',
      timeline: 'Estimated 2–10 weeks to close these gaps.',
      overallStatus: 'not-ready',
    },
  },
  {
    name: 'wholeFoods — GFSI hard gate + mixed remainder',
    retailer: 'wholeFoods',
    answers: {
      pd_gtin_valid: 'partial', pd_hierarchy: 'yes',
      syn_gdsn_active: 'yes', syn_coverage: 'partial',
      edi_asn_capable: 'partial', edi_asn_timing: 'partial', edi_label_compliant: 'partial',
      ff_otif_rate: 'partial',
      fin_cost_modeled: 'yes', fin_cash_runway: 'partial',
      prod_capacity_confirmed: 'yes', prod_lead_time: 'partial',
      comp_ingredients: 'no', comp_fsma_pcqi: 'yes', comp_gfsi_cert: 'no', comp_allergens: 'yes',
      team_owner: 'yes', team_chargeback_process: 'yes',
    },
    expected: {
      dimensions: {
        productData: { status: 'yellow', numeric: 60, hardGate: false },
        syndication: { status: 'green', numeric: 80, hardGate: false },
        edi: { status: 'yellow', numeric: 43, hardGate: false },
        fulfillment: { status: 'yellow', numeric: 33, hardGate: false },
        financial: { status: 'green', numeric: 80, hardGate: false },
        production: { status: 'green', numeric: 80, hardGate: false },
        compliance: { status: 'red', numeric: 0, hardGate: true },
        team: { status: 'green', numeric: 100, hardGate: false },
      },
      topBlockers: ['compliance', 'edi', 'fulfillment'],
      verdict: 'Not Ready for Whole Foods Launch',
      timeline: 'Estimated 2–10 weeks to close these gaps.',
      overallStatus: 'not-ready',
    },
  },
];

describe('demo golden — JS canonical output is locked', () => {
  for (const c of CASES) {
    it(c.name, () => {
      expect(score(c.retailer, c.answers)).toEqual(c.expected);
    });
  }
});
