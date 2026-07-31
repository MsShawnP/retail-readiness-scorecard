import { RETAILERS } from '../data/retailers.js';

export const DIMENSIONS = [
  'productData',
  'syndication',
  'edi',
  'fulfillment',
  'financial',
  'production',
  'compliance',
  'team',
];

export const DIMENSION_LABELS = {
  productData: 'Product Data',
  syndication: 'Syndication',
  edi: 'EDI Capability',
  fulfillment: 'Fulfillment',
  financial: 'Financial Readiness',
  production: 'Production Capacity',
  compliance: 'Compliance',
  team: 'Team & Process',
};

// Priority weights for getTopBlockers (higher surfaces first)
export const DIMENSION_WEIGHTS = {
  edi: 5,
  fulfillment: 5,
  syndication: 4,
  productData: 4,
  financial: 3,
  compliance: 3,
  production: 2,
  team: 2,
};

// Remediation weeks per Red dimension
const REMEDIATION_WEEKS = {
  edi:         { min: 8,  max: 12 },
  syndication: { min: 4,  max: 6  },
  productData: { min: 2,  max: 4  },
  compliance:  { min: 2,  max: 10 }, // WFM uses max=10; others use max=4
  fulfillment: { min: 4,  max: 8  },
  financial:   { min: 2,  max: 4  },
  production:  { min: 4,  max: 8  },
  team:        { min: 1,  max: 2  },
};

// Fallback line for a dimension card with no specific findings. Never claim
// "no gaps" for a non-green status — that would contradict the badge on an
// executive's report.
export function emptyStateText(status) {
  if (status === 'red') return 'Below the minimum threshold for this retailer — treat as launch-blocking.';
  if (status === 'yellow') return 'Partial readiness — close this gap before the buyer call.';
  return 'No critical gaps identified.';
}

function toStatus(numeric, greenThreshold = 70, yellowThreshold = 30) {
  if (numeric >= greenThreshold) return 'green';
  if (numeric >= yellowThreshold) return 'yellow';
  return 'red';
}

// ─── Product Data ──────────────────────────────────────────────────────────

function scoreProductData(answers, retailer) {
  const a = answers;
  let earned = 0;
  const maxPoints = retailer === 'walmart' ? 7 : 5;
  const findings = [];

  // Gate question
  if (a.pd_gtin_valid === 'no') {
    return {
      status: 'red',
      numeric: 0,
      findings: ['GTINs not valid or not in GS1 registry — item setup cannot proceed at any major retailer.'],
      fix: 'Validate all GTINs in GS1 registry; complete trade item hierarchy documentation.',
      hardGate: false,
    };
  }
  earned += a.pd_gtin_valid === 'yes' ? 3 : a.pd_gtin_valid === 'partial' ? 1 : 0;
  if (a.pd_gtin_valid === 'partial') findings.push('Some GTINs still unverified in the GS1 registry — confirm all before item setup.');

  earned += a.pd_hierarchy === 'yes' ? 2 : a.pd_hierarchy === 'partial' ? 1 : 0;
  if (a.pd_hierarchy === 'partial') findings.push('Trade item hierarchy partially documented — complete each/inner/case before submission.');
  if (a.pd_hierarchy === 'no') findings.push('Trade item hierarchy (each/inner/case) not documented.');

  if (retailer === 'walmart') {
    earned += a.pd_item360 === 'yes' ? 2 : a.pd_item360 === 'partial' ? 1 : 0;
    if (a.pd_item360 === 'partial') findings.push('Item 360 attributes in progress — some fields missing; item setup not yet approvable.');
    if (a.pd_item360 === 'no') findings.push('Item 360 / GDSN attributes incomplete — Walmart item setup will be rejected.');
  }

  const numeric = Math.round((earned / maxPoints) * 100);
  const status = toStatus(numeric);
  return {
    status,
    numeric,
    findings,
    fix: 'Validate all GTINs in GS1 registry; complete trade item hierarchy documentation.',
  };
}

// ─── Syndication ───────────────────────────────────────────────────────────

function scoreSyndication(answers) {
  const a = answers;
  const findings = [];

  if (a.syn_gdsn_active === 'no') {
    return {
      status: 'red',
      numeric: 0,
      findings: ['No 1WorldSync/GDSN account — product data cannot be syndicated to retailer systems.'],
      fix: 'Establish 1WorldSync account; complete GDSN syndication for all launch SKUs.',
    };
  }

  let earned = a.syn_gdsn_active === 'yes' ? 3 : 1;
  if (a.syn_gdsn_active === 'partial') findings.push('1WorldSync/GDSN account exists but the connection or data is incomplete.');
  earned += a.syn_coverage === 'yes' ? 2 : a.syn_coverage === 'partial' ? 1 : 0;
  if (a.syn_coverage === 'partial') findings.push('Some launch SKUs syndicated, others still in progress.');
  if (a.syn_coverage === 'no') findings.push('SKUs not fully syndicated to target retailer\'s data system.');

  const numeric = Math.round((earned / 5) * 100);
  return {
    status: toStatus(numeric),
    numeric,
    findings,
    fix: 'Establish 1WorldSync account; complete GDSN syndication for all launch SKUs.',
  };
}

// ─── EDI ───────────────────────────────────────────────────────────────────

function scoreEdi(answers, retailer) {
  const a = answers;
  const findings = [];

  if (a.edi_asn_capable === 'no') {
    return {
      status: 'red',
      numeric: 0,
      findings: ['No EDI capability — cannot receive purchase orders or send ASNs electronically. Retailer cannot process shipments.'],
      fix: 'Implement EDI capability (850/855/856/810/997); ensure ASN transmitted before gate-in; add FSMA 204 KDEs (Walmart).',
    };
  }

  const maxPoints = retailer === 'walmart' ? 9 : 7;
  let earned = a.edi_asn_capable === 'yes' ? 3 : 1;
  if (a.edi_asn_capable === 'partial') findings.push('EDI in setup or testing but not yet live — cannot transact until certified.');

  earned += a.edi_asn_timing === 'yes' ? 2 : a.edi_asn_timing === 'partial' ? 1 : 0;
  if (a.edi_asn_timing === 'partial') findings.push('ASN timing inconsistent — late ASNs will draw OTIF fines.');
  if (a.edi_asn_timing === 'no') findings.push('ASN not transmitted before gate-in/physical arrival — OTIF fines and receiving failures likely.');

  if (retailer === 'walmart') {
    earned += a.edi_fsma204 === 'yes' ? 2 : a.edi_fsma204 === 'partial' ? 1 : 0;
    if (a.edi_fsma204 === 'partial') findings.push('FSMA 204 Key Data Elements not consistently included — required on every Walmart food/beverage ASN as of August 2025.');
    if (a.edi_fsma204 === 'no') findings.push('ASN does not include FSMA 204 Key Data Elements — required for all Walmart food/beverage shipments as of August 2025.');
  }

  earned += a.edi_label_compliant === 'yes' ? 2 : a.edi_label_compliant === 'partial' ? 1 : 0;
  if (a.edi_label_compliant === 'partial') findings.push('GS1-128 / SSCC-18 label compliance has gaps — reconcile labels to the ASN before shipping.');
  if (a.edi_label_compliant === 'no') findings.push('GS1-128 / SSCC-18 labels non-compliant or not matching ASN.');

  const numeric = Math.round((earned / maxPoints) * 100);
  return {
    status: toStatus(numeric),
    numeric,
    findings,
    fix: 'Implement EDI capability (850/855/856/810/997); ensure ASN transmitted before gate-in; add FSMA 204 KDEs (Walmart).',
  };
}

// ─── Fulfillment ───────────────────────────────────────────────────────────

function scoreFulfillment(answers, retailer) {
  const a = answers;
  const findings = [];
  const retailerData = RETAILERS[retailer];

  const otifFindingByRetailer = {
    walmart: 'Current OTIF rate below 98% composite threshold — subject to 3% of COGS penalty per non-compliant PO.',
    costco: 'Delivery appointment compliance inconsistent — chargeback exposure.',
    wholeFoods: 'On-time delivery history inconsistent or undocumented.',
  };

  if (a.ff_otif_rate === 'no') {
    return {
      status: 'red',
      numeric: 0,
      findings: [otifFindingByRetailer[retailer] || 'OTIF rate below retailer threshold.'],
      fix: 'Improve delivery consistency; update label format to GS1-128 with correct SSCC-18.',
    };
  }

  // ff_label_compliant removed from question bank (covered by edi_label_compliant).
  // Max points: Costco = 4 (otif 3 + thermal 1), others = 3 (otif only).
  const otifPartialFindingByRetailer = {
    walmart: 'OTIF between 93–97% — below Walmart\'s 98% composite threshold; expect OTIF fines until resolved.',
    costco: 'Delivery history incomplete or inconsistent — a Costco buyer will ask to see it.',
    wholeFoods: 'On-time delivery tracked informally; documentation is limited.',
  };

  const maxPoints = retailer === 'costco' ? 4 : 3;
  let earned = a.ff_otif_rate === 'yes' ? 3 : 1;
  if (a.ff_otif_rate === 'partial') {
    findings.push(otifPartialFindingByRetailer[retailer] || 'OTIF performance below the retailer threshold.');
  }

  if (retailer === 'costco') {
    earned += a.ff_thermal === 'yes' ? 1 : 0;
    if (a.ff_thermal === 'partial') findings.push('Printing method unverified — confirm thermal transfer (not direct thermal) with your label vendor.');
    if (a.ff_thermal === 'no') findings.push('Direct thermal printing used — Costco requires thermal transfer. Labels will be rejected at depot.');
  }

  const numeric = Math.round((earned / maxPoints) * 100);
  const status = toStatus(numeric, retailerData.fulfillmentGreenThreshold, retailerData.fulfillmentYellowThreshold);
  return {
    status,
    numeric,
    findings,
    fix: 'Improve delivery consistency; update label format to GS1-128 with correct SSCC-18.',
  };
}

// ─── Financial ─────────────────────────────────────────────────────────────

function scoreFinancial(answers) {
  const a = answers;
  const findings = [];

  if (a.fin_cost_modeled === 'no') {
    return {
      status: 'red',
      numeric: 0,
      findings: ['Year-one retailer costs (slotting, trade spend, payment terms) not modeled — cash exposure unknown.'],
      fix: 'Model full year-one cost structure; confirm 90-day cash position including chargeback reserve.',
    };
  }

  let earned = a.fin_cost_modeled === 'yes' ? 3 : 1;
  if (a.fin_cost_modeled === 'partial') findings.push('Year-one costs estimated but not fully modeled — cash exposure not yet quantified.');
  earned += a.fin_cash_runway === 'yes' ? 2 : a.fin_cash_runway === 'partial' ? 1 : 0;
  if (a.fin_cash_runway === 'partial') findings.push('Cash runway is tight — little buffer if the launch slips or chargebacks spike.');
  if (a.fin_cash_runway === 'no') findings.push('Cash runway insufficient for first 90 days including chargeback buffer.');

  const numeric = Math.round((earned / 5) * 100);
  return {
    status: toStatus(numeric),
    numeric,
    findings,
    fix: 'Model full year-one cost structure; confirm 90-day cash position including chargeback reserve.',
  };
}

// ─── Production ────────────────────────────────────────────────────────────

function scoreProduction(answers) {
  const a = answers;
  const findings = [];

  if (a.prod_capacity_confirmed === 'no') {
    return {
      status: 'red',
      numeric: 0,
      findings: ['Co-packer capacity not confirmed for launch volume — supply risk is high.'],
      fix: 'Confirm co-packer capacity in writing; align production schedule with buyer delivery window.',
    };
  }

  let earned = a.prod_capacity_confirmed === 'yes' ? 3 : 1;
  if (a.prod_capacity_confirmed === 'partial') findings.push('Co-packer capacity indicated verbally but not confirmed in writing.');
  earned += a.prod_lead_time === 'yes' ? 2 : a.prod_lead_time === 'partial' ? 1 : 0;
  if (a.prod_lead_time === 'partial') findings.push('Lead time leaves no margin — any delay risks missing the buyer\'s first-ship date.');
  if (a.prod_lead_time === 'no') findings.push('Production lead time exceeds buyer\'s timeline window.');

  const numeric = Math.round((earned / 5) * 100);
  return {
    status: toStatus(numeric),
    numeric,
    findings,
    fix: 'Confirm co-packer capacity in writing; align production schedule with buyer delivery window.',
  };
}

// ─── Compliance ────────────────────────────────────────────────────────────

function scoreCompliance(answers, retailer) {
  const a = answers;
  const findings = [];

  // Whole Foods: prohibited ingredients hard gate — must be checked first
  if (retailer === 'wholeFoods' && a.comp_ingredients === 'yes') {
    return {
      status: 'red',
      numeric: 0,
      hardGate: true,
      findings: [
        'Product contains prohibited ingredients (artificial colors, flavors, or preservatives) — hard rejection by Whole Foods regardless of all other scores. Must reformulate before any WFM conversation.',
      ],
      fix: 'Reformulate to remove all prohibited ingredients per Whole Foods prohibited ingredient list.',
    };
  }

  const maxPoints = retailer === 'wholeFoods' ? 8 : 5;
  let earned = 0;

  // FSMA PCQI (all retailers)
  earned += a.comp_fsma_pcqi === 'yes' ? 3 : a.comp_fsma_pcqi === 'partial' ? 1 : 0;
  if (a.comp_fsma_pcqi === 'partial') findings.push('FSMA PCQI documentation in progress or needs updating.');
  if (a.comp_fsma_pcqi === 'no') findings.push('FSMA PCQI documentation not current — regulatory compliance gap.');

  // GFSI cert (Whole Foods only — hard gate if missing)
  if (retailer === 'wholeFoods') {
    if (a.comp_gfsi_cert === 'no') {
      return {
        status: 'red',
        numeric: 0,
        hardGate: true,
        findings: [
          'GFSI/SQF/BRCGS certification missing or expired — required for Whole Foods. Hard rejection regardless of other scores.',
        ],
        fix: 'Pursue GFSI-benchmarked certification (SQF, BRCGS, or equivalent); update FSMA PCQI documentation; verify allergen consistency.',
      };
    }
    earned += a.comp_gfsi_cert === 'yes' ? 3 : a.comp_gfsi_cert === 'partial' ? 1 : 0;
    if (a.comp_gfsi_cert === 'partial') findings.push('GFSI certification in progress or recently expired — Whole Foods requires it current before launch.');
  }

  // Allergens (all retailers)
  earned += a.comp_allergens === 'yes' ? 2 : a.comp_allergens === 'partial' ? 1 : 0;
  if (a.comp_allergens === 'partial') findings.push('Minor allergen-declaration discrepancies to reconcile across label, spec sheet, and GDSN data.');
  if (a.comp_allergens === 'no') findings.push('Allergen declarations inconsistent across label, spec sheet, and GDSN data.');

  const numeric = Math.round((earned / maxPoints) * 100);
  return {
    status: toStatus(numeric),
    numeric,
    findings,
    fix: 'Update FSMA PCQI documentation; pursue GFSI certification (WFM); verify allergen consistency.',
  };
}

// ─── Team & Process ────────────────────────────────────────────────────────

function scoreTeam(answers) {
  const a = answers;
  const findings = [];

  if (a.team_owner === 'no') {
    return {
      status: 'red',
      numeric: 0,
      findings: ['No named person owns day-to-day retailer relationship — critical communications will fall through.'],
      fix: 'Assign a named retailer owner; create chargeback dispute process and response SLA.',
    };
  }

  let earned = a.team_owner === 'yes' ? 3 : 1;
  if (a.team_owner === 'partial') findings.push('Retailer relationship ownership is shared or unclear — accountability gap.');
  earned += a.team_chargeback_process === 'yes' ? 2 : a.team_chargeback_process === 'partial' ? 1 : 0;
  if (a.team_chargeback_process === 'partial') findings.push('Chargeback handling is informal with no response SLA — deductions will slip.');
  if (a.team_chargeback_process === 'no') findings.push('No defined process for chargebacks and deductions — deduction dollars will be lost.');

  const numeric = Math.round((earned / 5) * 100);
  return {
    status: toStatus(numeric),
    numeric,
    findings,
    fix: 'Assign a named retailer owner; create chargeback dispute process and response SLA.',
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Score a single dimension.
 * @param {string} dimension - one of DIMENSIONS
 * @param {Object} answers - map of questionId → 'yes'|'partial'|'no'
 * @param {string} retailer - 'walmart'|'costco'|'wholeFoods'
 * @returns {{ status, numeric, findings, fix, hardGate? }}
 */
export function scoreDimension(dimension, answers, retailer) {
  switch (dimension) {
    case 'productData':  return scoreProductData(answers, retailer);
    case 'syndication':  return scoreSyndication(answers);
    case 'edi':          return scoreEdi(answers, retailer);
    case 'fulfillment':  return scoreFulfillment(answers, retailer);
    case 'financial':    return scoreFinancial(answers);
    case 'production':   return scoreProduction(answers);
    case 'compliance':   return scoreCompliance(answers, retailer);
    case 'team':         return scoreTeam(answers);
    default:
      throw new Error(`Unknown dimension: ${dimension}`);
  }
}

/**
 * Score all 8 dimensions from a flat answers object.
 * @param {Object} answers - all question answers
 * @param {string} retailer
 * @returns {Object} map of dimension → score result
 */
export function computeScores(answers, retailer) {
  const scores = {};
  for (const dim of DIMENSIONS) {
    scores[dim] = scoreDimension(dim, answers, retailer);
  }
  return scores;
}

/**
 * Return up to 3 dimensions to surface as priorities — Reds first (by weight
 * desc), then Yellows. Greens are never included: a "Top Priorities" list that
 * shows dimensions with no gaps is misleading on an executive's report. Returns
 * an empty array when every dimension is Green (caller shows an all-clear line).
 * @param {Object} scores - from computeScores
 * @returns {string[]} 0–3 dimension IDs
 */
export function getTopBlockers(scores) {
  const byStatus = { red: [], yellow: [], green: [] };
  for (const [dim, result] of Object.entries(scores)) {
    byStatus[result.status].push(dim);
  }
  const sortByWeight = (a, b) => (DIMENSION_WEIGHTS[b] || 0) - (DIMENSION_WEIGHTS[a] || 0);
  byStatus.red.sort(sortByWeight);
  byStatus.yellow.sort(sortByWeight);

  return [...byStatus.red, ...byStatus.yellow].slice(0, 3);
}

/**
 * Compute overall verdict and remediation timeline.
 * @param {Object} scores - from computeScores
 * @param {string} retailer
 * @returns {{ verdict, timeline, overallStatus }}
 */
export function getOverallVerdict(scores, retailer) {
  const retailerData = RETAILERS[retailer];
  const name = retailerData?.shortName || retailer;

  const redDimensions = DIMENSIONS.filter(d => scores[d]?.status === 'red');
  const yellowCount = DIMENSIONS.filter(d => scores[d]?.status === 'yellow').length;

  let overallStatus, verdict;
  if (redDimensions.length > 0) {
    overallStatus = 'not-ready';
    verdict = `Not Ready for ${name} Launch`;
  } else if (yellowCount > 0) {
    overallStatus = 'at-risk';
    verdict = `${yellowCount} Gap${yellowCount > 1 ? 's' : ''} to Close Before ${name}`;
  } else {
    overallStatus = 'ready';
    verdict = `Ready for ${name}`;
  }

  // Remediation timeline
  let timeline = 'No critical blockers identified.';
  if (redDimensions.length > 0) {
    let sumMin = 0, sumMax = 0;
    for (const dim of redDimensions) {
      const weeks = REMEDIATION_WEEKS[dim];
      if (weeks) {
        sumMin += weeks.min;
        // Use WFM compliance max of 10; others use 4
        const maxWeeks = (dim === 'compliance' && retailer !== 'wholeFoods') ? 4 : weeks.max;
        sumMax += maxWeeks;
      }
    }
    timeline = `Estimated ${sumMin}–${sumMax} weeks to close these gaps.`;
  }

  return { verdict, timeline, overallStatus };
}
