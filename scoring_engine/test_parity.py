"""Exhaustive JS/Python parity lock for the retail-readiness scoring engine.

The JavaScript engine (``src/engine/scoring.js``) is canonical — it drives the
live site. The Python engine (``scoring_engine/score.py``) is a standalone mirror
used by the client-mode report. This test proves they produce identical
SUBSTANTIVE output (per-dimension status + numeric + hardGate, top blockers,
verdict, remediation timeline, overall status) for every input — so a branded
client deliverable can never disagree with the tool the client used.

The advisory ``findings``/``fix`` prose is intentionally NOT compared: the Python
mirror condenses it and it is not part of the parity contract.

Coverage is exhaustive by decomposition. The engines score each dimension
independently, then aggregate the eight statuses into blockers/verdict/timeline.
So full-profile parity holds for ALL profiles iff:

  E1  per-dimension parity holds for every dimension input, and
  E2  aggregation parity holds for every combination of the eight statuses.

  * E1 — for each retailer, each dimension, the FULL cartesian product of that
    dimension's questions over {yes, partial, no} (a superset of the flow-reachable
    inputs), composed into a complete profile with every other dimension answered
    'yes'. Runs both engines end-to-end and compares the whole normalized result.
    This exercises every gate and cap-at-yellow path. Count: 402.
  * E2 — for each retailer, every one of the 3**8 status tuples, compared through
    getTopBlockers + getOverallVerdict. Count: 3 * 6561 = 19683.

Together they lock the entire end-to-end output for every possible assessment.

Requires Node (the canonical engine is JS). Skipped if node is unavailable.
"""
from __future__ import annotations

import itertools
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
SCORING_JS = REPO / "src" / "engine" / "scoring.js"
PARITY_DUMP = HERE / "parity_dump.mjs"

sys.path.insert(0, str(HERE))
import score as PY  # noqa: E402

RETAILERS = ["walmart", "costco", "wholeFoods"]
OPTS = ["yes", "partial", "no"]
STATUSES = ["red", "yellow", "green"]
DIMENSIONS = ["productData", "syndication", "edi", "fulfillment",
              "financial", "production", "compliance", "team"]

# Questions per (dimension, retailer), mirroring the `retailers` filter in
# src/data/questions.js. Kept in lockstep with the question bank.
QUESTIONS_BY_DIM = {
    "productData": {
        "walmart": ["pd_gtin_valid", "pd_hierarchy", "pd_item360"],
        "costco": ["pd_gtin_valid", "pd_hierarchy"],
        "wholeFoods": ["pd_gtin_valid", "pd_hierarchy"],
    },
    "syndication": {r: ["syn_gdsn_active", "syn_coverage"] for r in RETAILERS},
    "edi": {
        "walmart": ["edi_asn_capable", "edi_asn_timing", "edi_fsma204", "edi_label_compliant"],
        "costco": ["edi_asn_capable", "edi_asn_timing", "edi_label_compliant"],
        "wholeFoods": ["edi_asn_capable", "edi_asn_timing", "edi_label_compliant"],
    },
    "fulfillment": {
        "walmart": ["ff_otif_rate"],
        "costco": ["ff_otif_rate", "ff_thermal"],
        "wholeFoods": ["ff_otif_rate"],
    },
    "financial": {r: ["fin_cost_modeled", "fin_cash_runway"] for r in RETAILERS},
    "production": {r: ["prod_capacity_confirmed", "prod_lead_time"] for r in RETAILERS},
    "compliance": {
        "walmart": ["comp_fsma_pcqi", "comp_allergens"],
        "costco": ["comp_fsma_pcqi", "comp_allergens"],
        "wholeFoods": ["comp_ingredients", "comp_fsma_pcqi", "comp_gfsi_cert", "comp_allergens"],
    },
    "team": {r: ["team_owner", "team_chargeback_process"] for r in RETAILERS},
}

requires_node = pytest.mark.skipif(
    shutil.which("node") is None, reason="node not available; JS canonical engine cannot be run"
)


def _all_questions(retailer):
    qs = []
    for dim in DIMENSIONS:
        qs += QUESTIONS_BY_DIM[dim][retailer]
    return qs


def _baseline_yes(retailer):
    # Every question 'yes' — except comp_ingredients, whose 'yes' is a gate trigger
    # (prohibited ingredients present); its non-gate baseline is 'no'.
    a = {q: "yes" for q in _all_questions(retailer)}
    if "comp_ingredients" in a:
        a["comp_ingredients"] = "no"
    return a


def _py_full(retailer, answers):
    scores = PY.compute_scores(answers, retailer)
    dims = {d: {"status": scores[d]["status"], "numeric": scores[d]["numeric"],
                "hardGate": bool(scores[d].get("hardGate"))} for d in DIMENSIONS}
    v = PY.get_overall_verdict(scores, retailer)
    return {"dimensions": dims, "topBlockers": PY.get_top_blockers(scores),
            "verdict": v["verdict"], "timeline": v["timeline"],
            "overallStatus": v["overallStatus"]}


def _py_agg(retailer, statuses):
    scores = {d: {"status": s} for d, s in statuses.items()}
    v = PY.get_overall_verdict(scores, retailer)
    return {"topBlockers": PY.get_top_blockers(scores), "verdict": v["verdict"],
            "timeline": v["timeline"], "overallStatus": v["overallStatus"]}


def _run_js(cases, mode):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(cases, f)
        path = f.name
    try:
        r = subprocess.run(
            ["node", str(PARITY_DUMP), path, str(SCORING_JS), mode],
            capture_output=True, text=True, encoding="utf-8",
        )
        assert r.returncode == 0, f"node failed:\n{r.stderr}"
        return json.loads(r.stdout)
    finally:
        os.unlink(path)


def _e1_cases():
    cases = []
    for retailer in RETAILERS:
        for dim in DIMENSIONS:
            qs = QUESTIONS_BY_DIM[dim][retailer]
            for combo in itertools.product(OPTS, repeat=len(qs)):
                answers = _baseline_yes(retailer)
                answers.update(dict(zip(qs, combo)))
                cases.append({"retailer": retailer, "answers": answers,
                              "_tag": f"{retailer}/{dim}/{'-'.join(combo)}"})
    return cases


def _e2_cases():
    cases = []
    for retailer in RETAILERS:
        for tup in itertools.product(STATUSES, repeat=len(DIMENSIONS)):
            cases.append({"retailer": retailer, "statuses": dict(zip(DIMENSIONS, tup)),
                          "_tag": f"{retailer}/{'-'.join(tup)}"})
    return cases


@requires_node
def test_e1_per_dimension_end_to_end_parity():
    cases = _e1_cases()
    assert len(cases) == 402
    js = _run_js([{"retailer": c["retailer"], "answers": c["answers"]} for c in cases], "answers")
    divergences = []
    for c, jr in zip(cases, js):
        pr = _py_full(c["retailer"], c["answers"])
        if pr != jr:
            divergences.append((c["_tag"], jr, pr))
    assert not divergences, (
        f"{len(divergences)} of {len(cases)} answer-sets diverge; first: {divergences[0]}"
    )


@requires_node
def test_e2_aggregation_parity_all_status_tuples():
    cases = _e2_cases()
    assert len(cases) == 3 * (3 ** 8)  # 19683
    js = _run_js([{"retailer": c["retailer"], "statuses": c["statuses"]} for c in cases], "statuses")
    divergences = []
    for c, jr in zip(cases, js):
        pr = _py_agg(c["retailer"], c["statuses"])
        if pr != jr:
            divergences.append((c["_tag"], jr, pr))
    assert not divergences, (
        f"{len(divergences)} of {len(cases)} status tuples diverge; first: {divergences[0]}"
    )


def test_question_bank_matches_questions_js():
    """Guard the QUESTIONS_BY_DIM map against drift from src/data/questions.js.

    If the question bank changes (a question added/removed or its retailer set
    edited), this map must be updated or the exhaustive sweep silently under-covers.
    """
    import re
    text = (REPO / "src" / "data" / "questions.js").read_text(encoding="utf-8")
    # Collect (id, dimension, retailers[]) triples from the question objects.
    blocks = re.split(r"\{\s*\n\s*id:\s*'", text)
    found = {}
    for b in blocks[1:]:
        qid = b[: b.index("'")]
        dim_m = re.search(r"dimension:\s*'([^']+)'", b)
        ret_m = re.search(r"retailers:\s*\[([^\]]*)\]", b)
        if not dim_m or not ret_m:
            continue
        dim = dim_m.group(1)
        retailers = re.findall(r"'([^']+)'", ret_m.group(1))
        found.setdefault((dim,), {})
        for r in retailers:
            found[(dim,)].setdefault(r, []).append(qid)

    for dim in DIMENSIONS:
        for retailer in RETAILERS:
            expected = sorted(QUESTIONS_BY_DIM[dim][retailer])
            actual = sorted(found.get((dim,), {}).get(retailer, []))
            assert actual == expected, (
                f"question-bank drift for {dim}/{retailer}: "
                f"questions.js has {actual}, test map has {expected}"
            )
