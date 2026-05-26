import { describe, it, expect } from 'vitest';
import {
  scoreDimension,
  computeScores,
  getTopBlockers,
  getOverallVerdict,
  DIMENSIONS,
} from './scoring.js';

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
  it('returns green for walmart with all yes answers', () => {
    const result = scoreDimension('fulfillment', {
      ff_otif_rate: 'yes',
      ff_label_compliant: 'yes',
    }, 'walmart');
    expect(result.status).toBe('green');
  });

  it('returns green for wholeFoods with all yes answers (lower threshold)', () => {
    const result = scoreDimension('fulfillment', {
      ff_otif_rate: 'yes',
      ff_label_compliant: 'yes',
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

  it('returns empty-ish list when all green', () => {
    const scores = Object.fromEntries(
      ['productData','syndication','edi','fulfillment','financial','production','compliance','team']
        .map(d => [d, { status: 'green' }])
    );
    const blockers = getTopBlockers(scores);
    // With all green, returns 3 greens (highest weight first) — still length 3
    expect(blockers).toHaveLength(3);
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
