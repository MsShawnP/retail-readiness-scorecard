import { describe, it, expect } from 'vitest';
import {
  scoreDimension,
  computeScores,
  getTopBlockers,
  getOverallVerdict,
  emptyStateText,
  DIMENSIONS,
} from './scoring.js';
import { QUESTIONS } from '../data/questions.js';

// ─── EDI ───────────────────────────────────────────────────────────────────

describe('scoreDimension — edi', () => {
  it('returns red numeric=0 when edi_asn_capable is no (gate)', () => {
    const result = scoreDimension('edi', { edi_asn_capable: 'no' }, 'walmart');
    expect(result.status).toBe('red');
    expect(result.numeric).toBe(0);
  });

  it('returns green numeric=100 when all answers yes for walmart', () => {
    const result = scoreDimension('edi', {
      edi_asn_capable: 'yes',
      edi_asn_timing: 'yes',
      edi_fsma204: 'yes',
      edi_label_compliant: 'yes',
    }, 'walmart');
    expect(result.status).toBe('green');
    expect(result.numeric).toBe(100);
  });

  it('includes FSMA 204 finding when edi_fsma204 is no for walmart', () => {
    const result = scoreDimension('edi', {
      edi_asn_capable: 'yes',
      edi_asn_timing: 'yes',
      edi_fsma204: 'no',
      edi_label_compliant: 'yes',
    }, 'walmart');
    expect(result.findings.some(f => f.includes('FSMA 204'))).toBe(true);
  });

  it('does not apply fsma204 for costco', () => {
    const result = scoreDimension('edi', {
      edi_asn_capable: 'yes',
      edi_asn_timing: 'yes',
      edi_label_compliant: 'yes',
    }, 'costco');
    expect(result.status).toBe('green');
    expect(result.findings.some(f => f.includes('FSMA'))).toBe(false);
  });
});

// ─── Fulfillment ───────────────────────────────────────────────────────────

describe('scoreDimension — fulfillment', () => {
  it('returns green for walmart with otif yes', () => {
    const result = scoreDimension('fulfillment', {
      ff_otif_rate: 'yes',
    }, 'walmart');
    expect(result.status).toBe('green');
  });

  it('returns green for wholeFoods with otif yes (lower threshold)', () => {
    const result = scoreDimension('fulfillment', {
      ff_otif_rate: 'yes',
    }, 'wholeFoods');
    expect(result.status).toBe('green');
  });

  it('returns red when ff_otif_rate is no for walmart', () => {
    const result = scoreDimension('fulfillment', { ff_otif_rate: 'no' }, 'walmart');
    expect(result.status).toBe('red');
    expect(result.numeric).toBe(0);
    expect(result.findings.some(f => f.includes('98%'))).toBe(true);
  });

  it('returns red with chargeback finding for costco otif no', () => {
    const result = scoreDimension('fulfillment', { ff_otif_rate: 'no' }, 'costco');
    expect(result.status).toBe('red');
    expect(result.findings.some(f => f.toLowerCase().includes('chargeback'))).toBe(true);
  });

  it('includes thermal transfer finding for costco when ff_thermal is no', () => {
    const result = scoreDimension('fulfillment', {
      ff_otif_rate: 'yes',
      ff_label_compliant: 'yes',
      ff_thermal: 'no',
    }, 'costco');
    expect(result.findings.some(f => f.includes('thermal transfer'))).toBe(true);
  });
});

// ─── Compliance — Whole Foods hard gates ───────────────────────────────────

describe('scoreDimension — compliance (wholeFoods)', () => {
  it('returns red hardGate=true when prohibited ingredients present', () => {
    const result = scoreDimension('compliance', { comp_ingredients: 'yes' }, 'wholeFoods');
    expect(result.status).toBe('red');
    expect(result.hardGate).toBe(true);
    expect(result.numeric).toBe(0);
  });

  it('returns green for wholeFoods with all requirements met', () => {
    const result = scoreDimension('compliance', {
      comp_ingredients: 'no',
      comp_fsma_pcqi: 'yes',
      comp_gfsi_cert: 'yes',
      comp_allergens: 'yes',
    }, 'wholeFoods');
    expect(result.status).toBe('green');
  });

  it('returns red hardGate=true when gfsi cert missing for wholeFoods', () => {
    const result = scoreDimension('compliance', {
      comp_ingredients: 'no',
      comp_fsma_pcqi: 'yes',
      comp_gfsi_cert: 'no',
      comp_allergens: 'yes',
    }, 'wholeFoods');
    expect(result.status).toBe('red');
    expect(result.hardGate).toBe(true);
  });

  it('does not apply gfsi gate for walmart', () => {
    // walmart with all base compliance questions answered yes should be green
    const result = scoreDimension('compliance', {
      comp_fsma_pcqi: 'yes',
      comp_allergens: 'yes',
    }, 'walmart');
    expect(result.status).toBe('green');
  });
});

// ─── getTopBlockers ────────────────────────────────────────────────────────

describe('getTopBlockers', () => {
  it('returns up to 3 items with reds before yellows', () => {
    const scores = {
      productData: { status: 'yellow' },
      syndication: { status: 'yellow' },
      edi: { status: 'red' },
      fulfillment: { status: 'red' },
      financial: { status: 'yellow' },
      production: { status: 'yellow' },
      compliance: { status: 'green' },
      team: { status: 'green' },
    };
    const blockers = getTopBlockers(scores);
    expect(blockers).toHaveLength(3);
    expect(blockers[0]).toBe('edi');       // red, weight 5
    expect(blockers[1]).toBe('fulfillment'); // red, weight 5 (same weight as edi)
    // third is highest-weight yellow
    expect(['syndication', 'productData']).toContain(blockers[2]);
  });

  it('returns an empty list when all green (never pads with greens)', () => {
    const scores = Object.fromEntries(
      ['productData','syndication','edi','fulfillment','financial','production','compliance','team']
        .map(d => [d, { status: 'green' }])
    );
    const blockers = getTopBlockers(scores);
    // A "Top Priorities" list must never show dimensions that have no gaps.
    expect(blockers).toHaveLength(0);
  });

  it('never includes a green dimension even when fewer than 3 issues exist', () => {
    const scores = {
      productData: { status: 'green' },
      syndication: { status: 'green' },
      edi: { status: 'red' },
      fulfillment: { status: 'green' },
      financial: { status: 'yellow' },
      production: { status: 'green' },
      compliance: { status: 'green' },
      team: { status: 'green' },
    };
    const blockers = getTopBlockers(scores);
    expect(blockers).toEqual(['edi', 'financial']); // red before yellow, no green padding
  });
});

// ─── Partial-answer middle band (the untested band where wrong colors hide) ──

describe('scoreDimension — partial answers diverge by retailer (fulfillment)', () => {
  it('otif partial is RED for walmart (33% < 40 yellow threshold)', () => {
    const r = scoreDimension('fulfillment', { ff_otif_rate: 'partial' }, 'walmart');
    expect(r.numeric).toBe(33);
    expect(r.status).toBe('red');
    expect(r.findings.length).toBeGreaterThan(0); // never blank
  });

  it('otif partial is YELLOW for wholeFoods (33% >= 30 yellow threshold)', () => {
    const r = scoreDimension('fulfillment', { ff_otif_rate: 'partial' }, 'wholeFoods');
    expect(r.numeric).toBe(33);
    expect(r.status).toBe('yellow');
    expect(r.findings.length).toBeGreaterThan(0);
  });

  it('otif partial + thermal no is RED for costco (25%)', () => {
    const r = scoreDimension('fulfillment', { ff_otif_rate: 'partial', ff_thermal: 'no' }, 'costco');
    expect(r.numeric).toBe(25);
    expect(r.status).toBe('red');
  });
});

describe('scoreDimension — threshold boundaries', () => {
  it('productData walmart yes/yes/no lands at exactly 71% GREEN', () => {
    const r = scoreDimension('productData', {
      pd_gtin_valid: 'yes', pd_hierarchy: 'yes', pd_item360: 'no',
    }, 'walmart');
    expect(r.numeric).toBe(71); // 5/7
    expect(r.status).toBe('green');
  });

  it('edi walmart yes/partial/partial/partial lands at exactly 67% YELLOW', () => {
    const r = scoreDimension('edi', {
      edi_asn_capable: 'yes', edi_asn_timing: 'partial',
      edi_fsma204: 'partial', edi_label_compliant: 'partial',
    }, 'walmart');
    expect(r.numeric).toBe(67); // 6/9
    expect(r.status).toBe('yellow');
  });
});

describe('scoreDimension — WFM hard-gate near-misses must NOT gate', () => {
  it('comp_gfsi_cert partial is scored, not hard-gated', () => {
    const r = scoreDimension('compliance', {
      comp_ingredients: 'no', comp_fsma_pcqi: 'yes',
      comp_gfsi_cert: 'partial', comp_allergens: 'yes',
    }, 'wholeFoods');
    expect(r.hardGate).toBeFalsy();
    expect(r.numeric).toBeGreaterThan(0);
  });

  it('comp_ingredients partial (unsure) does not fire the prohibited-ingredient gate', () => {
    const r = scoreDimension('compliance', {
      comp_ingredients: 'partial', comp_fsma_pcqi: 'yes',
      comp_gfsi_cert: 'yes', comp_allergens: 'yes',
    }, 'wholeFoods');
    expect(r.hardGate).toBeFalsy();
    expect(r.status).not.toBe('red');
  });
});

// ─── Invariant: a non-green dimension is never presented as "no gaps" ─────────

describe('empty-state / findings invariant', () => {
  it('emptyStateText never claims "no gaps" for red or yellow', () => {
    expect(emptyStateText('green')).toMatch(/no critical gaps/i);
    expect(emptyStateText('yellow')).not.toMatch(/no critical gaps/i);
    expect(emptyStateText('red')).not.toMatch(/no critical gaps/i);
  });

  it('every non-green dimension result carries at least one finding', () => {
    // Realistic sweep: start every dimension question at its best answer, then
    // flip ONE question to partial/no (as a completed real assessment would look)
    // and assert that any resulting non-green status is explained by a finding.
    const bestAnswer = q => (q.id === 'comp_ingredients' ? 'no' : 'yes');
    const retailers = ['walmart', 'costco', 'wholeFoods'];
    for (const retailer of retailers) {
      const dims = [...new Set(QUESTIONS.filter(q => q.retailers.includes(retailer)).map(q => q.dimension))];
      for (const dim of dims) {
        const dimQs = QUESTIONS.filter(q => q.dimension === dim && q.retailers.includes(retailer));
        for (const target of dimQs) {
          for (const val of ['partial', 'no']) {
            const answers = Object.fromEntries(dimQs.map(q => [q.id, bestAnswer(q)]));
            answers[target.id] = val;
            const r = scoreDimension(dim, answers, retailer);
            if (r.status !== 'green') {
              expect(
                r.findings.length,
                `${retailer}/${dim} (${target.id}=${val}) is ${r.status} but has no findings`
              ).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });
});

// ─── N2: gate values in questions.js stay in sync with scoring.js behavior ────

describe('gate integrity — questions.js redGateValues match scoring.js', () => {
  it('every gate question, answered with its gate value, scores the dimension Red 0', () => {
    const gateQuestions = QUESTIONS.filter(q => q.isGate && q.redGateValues.length > 0);
    expect(gateQuestions.length).toBeGreaterThan(0);
    for (const q of gateQuestions) {
      for (const gateVal of q.redGateValues) {
        const retailer = q.retailers[0];
        const r = scoreDimension(q.dimension, { [q.id]: gateVal }, retailer);
        expect(
          r.status,
          `${q.id}=${gateVal} should gate ${q.dimension} Red for ${retailer}`
        ).toBe('red');
        expect(r.numeric).toBe(0);
      }
    }
  });
});

// ─── getOverallVerdict ─────────────────────────────────────────────────────

describe('getOverallVerdict', () => {
  function makeScores(overrides = {}) {
    const base = Object.fromEntries(
      DIMENSIONS.map(d => [d, { status: 'green' }])
    );
    return { ...base, ...overrides };
  }

  it('returns ready when all green', () => {
    const { overallStatus, verdict } = getOverallVerdict(makeScores(), 'walmart');
    expect(overallStatus).toBe('ready');
    expect(verdict).toMatch(/Ready for Walmart/);
  });

  it('returns at-risk with yellow count when no reds', () => {
    const scores = makeScores({ edi: { status: 'yellow' }, fulfillment: { status: 'yellow' } });
    const { overallStatus, verdict } = getOverallVerdict(scores, 'walmart');
    expect(overallStatus).toBe('at-risk');
    expect(verdict).toMatch(/2 Gaps/);
  });

  it('returns not-ready when any red', () => {
    const scores = makeScores({ edi: { status: 'red' } });
    const { overallStatus, verdict } = getOverallVerdict(scores, 'walmart');
    expect(overallStatus).toBe('not-ready');
    expect(verdict).toMatch(/Not Ready for Walmart/);
  });

  it('calculates remediation timeline for edi + fulfillment red (walmart)', () => {
    const scores = makeScores({
      edi: { status: 'red' },
      fulfillment: { status: 'red' },
    });
    const { timeline } = getOverallVerdict(scores, 'walmart');
    // edi: 8-12wk + fulfillment: 4-8wk = 12-20wk
    expect(timeline).toMatch(/12.{1,3}20 weeks/);
  });

  it('uses no blockers message when all green', () => {
    const { timeline } = getOverallVerdict(makeScores(), 'walmart');
    expect(timeline).toMatch(/No critical blockers/);
  });
});
