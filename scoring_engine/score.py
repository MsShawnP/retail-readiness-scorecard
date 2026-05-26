#!/usr/bin/env python3
"""
Retail Readiness Scorecard — Python scoring script.

Reads YAML retailer rules and scores a set of answers against them.
Produces output identical to the JavaScript scoring engine (scoring.js).

Usage:
  python scoring_engine/score.py --retailer walmart --answers '{"edi_asn_capable":"yes",...}'
  python scoring_engine/score.py --retailer wholeFoods --answers-file answers.json

Retailer IDs: walmart | costco | wholeFoods
"""

import argparse
import json
import sys
from pathlib import Path


# ─── Constants ────────────────────────────────────────────────────────────────

DIMENSIONS = [
    'productData', 'syndication', 'edi', 'fulfillment',
    'financial', 'production', 'compliance', 'team',
]

DIMENSION_WEIGHTS = {
    'edi': 5, 'fulfillment': 5, 'syndication': 4, 'productData': 4,
    'financial': 3, 'compliance': 3, 'production': 2, 'team': 2,
}

REMEDIATION_WEEKS = {
    'edi':         {'min': 8,  'max': 12},
    'syndication': {'min': 4,  'max': 6},
    'productData': {'min': 2,  'max': 4},
    'compliance':  {'min': 2,  'max': 10},
    'fulfillment': {'min': 4,  'max': 8},
    'financial':   {'min': 2,  'max': 4},
    'production':  {'min': 4,  'max': 8},
    'team':        {'min': 1,  'max': 2},
}

RETAILER_NAMES = {
    'walmart': 'Walmart',
    'costco': 'Costco',
    'wholeFoods': 'Whole Foods',
}

FULFILLMENT_THRESHOLDS = {
    'walmart':    {'green': 75, 'yellow': 40},
    'costco':     {'green': 70, 'yellow': 35},
    'wholeFoods': {'green': 65, 'yellow': 30},
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def to_status(numeric, green=70, yellow=30):
    if numeric >= green:
        return 'green'
    if numeric >= yellow:
        return 'yellow'
    return 'red'


def pts(answers, key):
    """Return point value for an answer: yes=3, partial=1, no=0."""
    v = answers.get(key)
    return 3 if v == 'yes' else 1 if v == 'partial' else 0


# ─── Dimension scorers ─────────────────────────────────────────────────────────

def score_product_data(answers, retailer):
    max_pts = 7 if retailer == 'walmart' else 5
    findings = []

    if answers.get('pd_gtin_valid') == 'no':
        return {'status': 'red', 'numeric': 0,
                'findings': ['GTINs not valid or not in GS1 registry — item setup cannot proceed.'],
                'fix': 'Validate all GTINs in GS1 registry; complete trade item hierarchy documentation.'}

    earned = pts(answers, 'pd_gtin_valid')
    earned += pts(answers, 'pd_hierarchy') if answers.get('pd_hierarchy') in ('yes','partial') else 0
    if answers.get('pd_hierarchy') == 'no':
        findings.append('Trade item hierarchy (each/inner/case) not documented.')

    if retailer == 'walmart':
        earned += pts(answers, 'pd_item360') if answers.get('pd_item360') in ('yes','partial') else 0
        if answers.get('pd_item360') == 'no':
            findings.append('Item 360 / GDSN attributes incomplete — Walmart item setup will be rejected.')

    numeric = round((earned / max_pts) * 100)
    return {'status': to_status(numeric), 'numeric': numeric, 'findings': findings,
            'fix': 'Validate all GTINs in GS1 registry; complete trade item hierarchy documentation.'}


def score_syndication(answers, retailer):
    findings = []
    if answers.get('syn_gdsn_active') == 'no':
        return {'status': 'red', 'numeric': 0,
                'findings': ['No 1WorldSync/GDSN account — product data cannot be syndicated.'],
                'fix': 'Establish 1WorldSync account; complete GDSN syndication for all launch SKUs.'}

    earned = 3 if answers.get('syn_gdsn_active') == 'yes' else 1
    earned += pts(answers, 'syn_coverage') if answers.get('syn_coverage') in ('yes','partial') else 0
    if answers.get('syn_coverage') == 'no':
        findings.append("SKUs not fully syndicated to target retailer's data system.")

    numeric = round((earned / 5) * 100)
    return {'status': to_status(numeric), 'numeric': numeric, 'findings': findings,
            'fix': 'Establish 1WorldSync account; complete GDSN syndication for all launch SKUs.'}


def score_edi(answers, retailer):
    findings = []
    if answers.get('edi_asn_capable') == 'no':
        return {'status': 'red', 'numeric': 0,
                'findings': ['No EDI capability — cannot receive purchase orders or send ASNs electronically.'],
                'fix': 'Implement EDI capability (850/855/856/810/997); ensure ASN before gate-in.'}

    max_pts = 9 if retailer == 'walmart' else 7
    earned = 3 if answers.get('edi_asn_capable') == 'yes' else 1
    earned += pts(answers, 'edi_asn_timing') if answers.get('edi_asn_timing') in ('yes','partial') else 0
    if answers.get('edi_asn_timing') == 'no':
        findings.append('ASN not transmitted before gate-in/physical arrival.')

    if retailer == 'walmart':
        earned += pts(answers, 'edi_fsma204') if answers.get('edi_fsma204') in ('yes','partial') else 0
        if answers.get('edi_fsma204') == 'no':
            findings.append('ASN does not include FSMA 204 Key Data Elements — required as of August 2025.')

    earned += pts(answers, 'edi_label_compliant') if answers.get('edi_label_compliant') in ('yes','partial') else 0
    if answers.get('edi_label_compliant') == 'no':
        findings.append('GS1-128 / SSCC-18 labels non-compliant or not matching ASN.')

    numeric = round((earned / max_pts) * 100)
    return {'status': to_status(numeric), 'numeric': numeric, 'findings': findings,
            'fix': 'Implement EDI; ensure ASN timing; add FSMA 204 KDEs (Walmart).'}


def score_fulfillment(answers, retailer):
    findings = []
    thresholds = FULFILLMENT_THRESHOLDS[retailer]
    otif_finding = {
        'walmart': 'Current OTIF rate below 98% composite threshold — 3% of COGS penalty per PO.',
        'costco': 'Delivery appointment compliance inconsistent — chargeback exposure.',
        'wholeFoods': 'On-time delivery history inconsistent or undocumented.',
    }

    if answers.get('ff_otif_rate') == 'no':
        return {'status': 'red', 'numeric': 0,
                'findings': [otif_finding.get(retailer, 'OTIF rate below threshold.')],
                'fix': 'Improve delivery consistency; update label format to GS1-128 with correct SSCC-18.'}

    max_pts = 6 if retailer == 'costco' else 5
    earned = 3 if answers.get('ff_otif_rate') == 'yes' else 1
    earned += pts(answers, 'ff_label_compliant') if answers.get('ff_label_compliant') in ('yes','partial') else 0
    if answers.get('ff_label_compliant') == 'no':
        findings.append('Shipping labels non-compliant or SSCC not matching ASN.')

    if retailer == 'costco':
        earned += 1 if answers.get('ff_thermal') == 'yes' else 0
        if answers.get('ff_thermal') == 'no':
            findings.append('Direct thermal printing used — Costco requires thermal transfer.')

    numeric = round((earned / max_pts) * 100)
    return {'status': to_status(numeric, thresholds['green'], thresholds['yellow']),
            'numeric': numeric, 'findings': findings,
            'fix': 'Improve delivery consistency; update label format to GS1-128 with correct SSCC-18.'}


def score_financial(answers, retailer):
    findings = []
    if answers.get('fin_cost_modeled') == 'no':
        return {'status': 'red', 'numeric': 0,
                'findings': ['Year-one retailer costs not modeled — cash exposure unknown.'],
                'fix': 'Model full year-one cost structure; confirm 90-day cash position including chargeback reserve.'}

    earned = 3 if answers.get('fin_cost_modeled') == 'yes' else 1
    earned += pts(answers, 'fin_cash_runway') if answers.get('fin_cash_runway') in ('yes','partial') else 0
    if answers.get('fin_cash_runway') == 'no':
        findings.append('Cash runway insufficient for first 90 days including chargeback buffer.')

    numeric = round((earned / 5) * 100)
    return {'status': to_status(numeric), 'numeric': numeric, 'findings': findings,
            'fix': 'Model full year-one cost structure; confirm 90-day cash position.'}


def score_production(answers, retailer):
    findings = []
    if answers.get('prod_capacity_confirmed') == 'no':
        return {'status': 'red', 'numeric': 0,
                'findings': ['Co-packer capacity not confirmed for launch volume.'],
                'fix': 'Confirm co-packer capacity in writing; align production schedule with buyer delivery window.'}

    earned = 3 if answers.get('prod_capacity_confirmed') == 'yes' else 1
    earned += pts(answers, 'prod_lead_time') if answers.get('prod_lead_time') in ('yes','partial') else 0
    if answers.get('prod_lead_time') == 'no':
        findings.append("Production lead time exceeds buyer's timeline window.")

    numeric = round((earned / 5) * 100)
    return {'status': to_status(numeric), 'numeric': numeric, 'findings': findings,
            'fix': 'Confirm co-packer capacity in writing; align production schedule.'}


def score_compliance(answers, retailer):
    findings = []

    if retailer == 'wholeFoods' and answers.get('comp_ingredients') == 'yes':
        return {'status': 'red', 'numeric': 0, 'hardGate': True,
                'findings': ['Product contains prohibited ingredients — hard rejection by Whole Foods regardless of all other scores.'],
                'fix': 'Reformulate to remove all prohibited ingredients per Whole Foods prohibited ingredient list.'}

    max_pts = 8 if retailer == 'wholeFoods' else 5
    earned = pts(answers, 'comp_fsma_pcqi') if answers.get('comp_fsma_pcqi') in ('yes','partial') else 0
    if answers.get('comp_fsma_pcqi') == 'no':
        findings.append('FSMA PCQI documentation not current.')

    if retailer == 'wholeFoods':
        if answers.get('comp_gfsi_cert') == 'no':
            return {'status': 'red', 'numeric': 0, 'hardGate': True,
                    'findings': ['GFSI/SQF/BRCGS certification missing or expired — required for Whole Foods.'],
                    'fix': 'Pursue GFSI certification; update FSMA PCQI documentation.'}
        earned += pts(answers, 'comp_gfsi_cert') if answers.get('comp_gfsi_cert') in ('yes','partial') else 0

    earned += pts(answers, 'comp_allergens') if answers.get('comp_allergens') in ('yes','partial') else 0
    if answers.get('comp_allergens') == 'no':
        findings.append('Allergen declarations inconsistent across label, spec sheet, and GDSN data.')

    numeric = round((earned / max_pts) * 100)
    return {'status': to_status(numeric), 'numeric': numeric, 'findings': findings,
            'fix': 'Update FSMA PCQI; pursue GFSI cert (WFM); verify allergen consistency.'}


def score_team(answers, retailer):
    findings = []
    if answers.get('team_owner') == 'no':
        return {'status': 'red', 'numeric': 0,
                'findings': ['No named person owns day-to-day retailer relationship.'],
                'fix': 'Assign a named retailer owner; create chargeback dispute process and response SLA.'}

    earned = 3 if answers.get('team_owner') == 'yes' else 1
    earned += pts(answers, 'team_chargeback_process') if answers.get('team_chargeback_process') in ('yes','partial') else 0
    if answers.get('team_chargeback_process') == 'no':
        findings.append('No defined process for chargebacks and deductions.')

    numeric = round((earned / 5) * 100)
    return {'status': to_status(numeric), 'numeric': numeric, 'findings': findings,
            'fix': 'Assign a named retailer owner; create chargeback dispute process.'}


# ─── Public scoring API ────────────────────────────────────────────────────────

def score_dimension(dimension, answers, retailer):
    scorers = {
        'productData': score_product_data,
        'syndication': score_syndication,
        'edi': score_edi,
        'fulfillment': score_fulfillment,
        'financial': score_financial,
        'production': score_production,
        'compliance': score_compliance,
        'team': score_team,
    }
    if dimension not in scorers:
        raise ValueError(f'Unknown dimension: {dimension}')
    return scorers[dimension](answers, retailer)


def compute_scores(answers, retailer):
    return {dim: score_dimension(dim, answers, retailer) for dim in DIMENSIONS}


def get_top_blockers(scores):
    by_status = {'red': [], 'yellow': [], 'green': []}
    for dim, result in scores.items():
        by_status[result['status']].append(dim)
    sort_key = lambda d: -DIMENSION_WEIGHTS.get(d, 0)
    for status in by_status:
        by_status[status].sort(key=sort_key)
    return (by_status['red'] + by_status['yellow'] + by_status['green'])[:3]


def get_overall_verdict(scores, retailer):
    name = RETAILER_NAMES.get(retailer, retailer)
    red_dims = [d for d in DIMENSIONS if scores[d]['status'] == 'red']
    yellow_count = sum(1 for d in DIMENSIONS if scores[d]['status'] == 'yellow')

    if red_dims:
        overall_status = 'not-ready'
        verdict = f'Not Ready for {name} Launch'
    elif yellow_count:
        overall_status = 'at-risk'
        verdict = f'{yellow_count} Gap{"s" if yellow_count > 1 else ""} to Close Before {name}'
    else:
        overall_status = 'ready'
        verdict = f'Ready for {name}'

    if not red_dims:
        timeline = 'No critical blockers identified.'
    else:
        sum_min = sum(REMEDIATION_WEEKS[d]['min'] for d in red_dims if d in REMEDIATION_WEEKS)
        sum_max = 0
        for d in red_dims:
            if d not in REMEDIATION_WEEKS:
                continue
            max_w = 4 if (d == 'compliance' and retailer != 'wholeFoods') else REMEDIATION_WEEKS[d]['max']
            sum_max += max_w
        timeline = f'Estimated {sum_min}–{sum_max} weeks to close these gaps.'

    return {'verdict': verdict, 'timeline': timeline, 'overallStatus': overall_status}


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Score a retail readiness assessment.')
    parser.add_argument('--retailer', required=True, choices=['walmart', 'costco', 'wholeFoods'],
                        help='Target retailer ID')
    parser.add_argument('--answers', help='JSON string of answers')
    parser.add_argument('--answers-file', help='Path to JSON file of answers')
    args = parser.parse_args()

    if args.answers_file:
        answers = json.loads(Path(args.answers_file).read_text())
    elif args.answers:
        answers = json.loads(args.answers)
    else:
        print('Error: provide --answers or --answers-file', file=sys.stderr)
        sys.exit(1)

    scores = compute_scores(answers, args.retailer)
    top_blockers = get_top_blockers(scores)
    verdict_data = get_overall_verdict(scores, args.retailer)

    output = {
        'retailer': args.retailer,
        'dimensions': {
            dim: {
                'status': result['status'],
                'numeric': result['numeric'],
                'findings': result.get('findings', []),
                'fix': result.get('fix', ''),
            }
            for dim, result in scores.items()
        },
        'topBlockers': top_blockers,
        **verdict_data,
    }
    print(json.dumps(output, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
