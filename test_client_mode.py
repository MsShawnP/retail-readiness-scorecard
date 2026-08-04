"""Client-mode tests for retail-readiness-scorecard: intake, preflight, provenance.

Covers the branded scorecard path, the blocked Data Readiness Report path, the
proceed-with-warnings path, the --final watermark drop, offline-safety, logo
embedding, and adversarial answer files (checklist §6). Also guards the Python
question bank against drift from src/data/questions.js.

Skipped if lailara_engagement isn't installed.
"""
import base64
import json
import re
from pathlib import Path

import pytest

pytest.importorskip("lailara_engagement")

import client_mode  # noqa: E402

REPO = Path(__file__).resolve().parent

_CONFIG = """
client: {name: Meridian Farms}
engagement: {id: MER-2026-08}
as_of_date: 2026-07-31
prepared_by: Lailara LLC
demo: true
"""

# A complete Walmart answer-set: not-ready (FSMA-204 gate + Item 360 cap + partial OTIF).
_FULL_WALMART = {
    "pd_gtin_valid": "yes", "pd_hierarchy": "partial", "pd_item360": "no",
    "syn_gdsn_active": "yes", "syn_coverage": "partial",
    "edi_asn_capable": "yes", "edi_asn_timing": "partial", "edi_fsma204": "no",
    "edi_label_compliant": "yes",
    "ff_otif_rate": "partial",
    "fin_cost_modeled": "yes", "fin_cash_runway": "no",
    "prod_capacity_confirmed": "yes", "prod_lead_time": "yes",
    "comp_fsma_pcqi": "yes", "comp_allergens": "partial",
    "team_owner": "yes", "team_chargeback_process": "partial",
}


@pytest.fixture
def cfg(tmp_path):
    p = tmp_path / "engagement.demo.yml"
    p.write_text(_CONFIG, encoding="utf-8")
    return str(p)


def _write_answers(tmp_path, retailer, answers, name="answers.json", encoding="utf-8"):
    p = tmp_path / name
    p.write_bytes(json.dumps({"retailer": retailer, "answers": answers}).encode(encoding))
    return str(p)


def test_full_answer_set_scores_and_brands(cfg, tmp_path):
    src = _write_answers(tmp_path, "walmart", _FULL_WALMART)
    out = str(tmp_path / "client-output")
    result = client_mode.run(cfg, src, out)
    assert result["status"] == "ok"
    assert result["overallStatus"] == "not-ready"
    assert result["verdict"] == "Not Ready for Walmart Launch"
    assert result["topBlockers"] == ["edi", "fulfillment", "productData"]
    assert result["warnings"] == 0
    html = Path(result["report"]).read_text(encoding="utf-8")
    assert "Meridian Farms" in html          # client name branded
    assert "#f5f3ee" in html                 # Lailara canvas
    assert "SHA-256" in html                 # provenance footer
    assert "DRAFT" in html                   # draft watermark by default
    assert "FSMA 204" in html                # engine finding surfaced


def test_scores_match_python_engine(cfg, tmp_path):
    # The branded report's scores must be the canonical engine's scores.
    import sys
    sys.path.insert(0, str(REPO / "scoring_engine"))
    import score as ENGINE
    scores = ENGINE.compute_scores(_FULL_WALMART, "walmart")
    src = _write_answers(tmp_path, "walmart", _FULL_WALMART)
    result = client_mode.run(cfg, src, str(tmp_path / "out"))
    assert result["topBlockers"] == ENGINE.get_top_blockers(scores)


def test_report_is_offline_safe(cfg, tmp_path):
    src = _write_answers(tmp_path, "walmart", _FULL_WALMART)
    result = client_mode.run(cfg, src, str(tmp_path / "out"))
    html = Path(result["report"]).read_text(encoding="utf-8")
    assert not re.search(r"https?://|@import|<script", html, re.I)


def test_invalid_retailer_is_blocked(cfg, tmp_path):
    src = _write_answers(tmp_path, "target", {"pd_gtin_valid": "yes"})
    result = client_mode.run(cfg, src, str(tmp_path / "out"))
    assert result["status"] == "blocked"
    html = Path(result["readiness_report"]).read_text(encoding="utf-8")
    assert "retailer" in html.lower()


def test_invalid_answer_value_is_blocked_no_coercion(cfg, tmp_path):
    answers = dict(_FULL_WALMART, ff_otif_rate="maybe")
    src = _write_answers(tmp_path, "walmart", answers)
    result = client_mode.run(cfg, src, str(tmp_path / "out"))
    assert result["status"] == "blocked"
    html = Path(result["readiness_report"]).read_text(encoding="utf-8")
    assert "ff_otif_rate" in html and "maybe" in html


def test_missing_gate_question_is_blocked(cfg, tmp_path):
    answers = {k: v for k, v in _FULL_WALMART.items() if k != "edi_asn_capable"}
    src = _write_answers(tmp_path, "walmart", answers)
    result = client_mode.run(cfg, src, str(tmp_path / "out"))
    assert result["status"] == "blocked"
    html = Path(result["readiness_report"]).read_text(encoding="utf-8")
    assert "edi_asn_capable" in html


def test_missing_followup_proceeds_with_warning(cfg, tmp_path):
    # Dropping a non-gate follow-up (fin_cash_runway) should NOT block; it is
    # disclosed as an assumption and stamped proceeded-with-warnings.
    answers = {k: v for k, v in _FULL_WALMART.items() if k != "fin_cash_runway"}
    src = _write_answers(tmp_path, "walmart", answers)
    result = client_mode.run(cfg, src, str(tmp_path / "out"))
    assert result["status"] == "ok"
    assert result["warnings"] == 1
    html = Path(result["report"]).read_text(encoding="utf-8")
    assert "Data limitations" in html
    assert "fin_cash_runway" in html
    assert "proceeded with warnings (1)" in html


def test_gate_tripped_dimension_needs_no_followups(cfg, tmp_path):
    # edi_asn_capable = 'no' gates EDI red; the follow-ups may be absent and it
    # must still be clean (not a missing-question warning).
    answers = {
        "pd_gtin_valid": "yes", "pd_hierarchy": "yes", "pd_item360": "yes",
        "syn_gdsn_active": "yes", "syn_coverage": "yes",
        "edi_asn_capable": "no",  # gate -> follow-ups not required
        "ff_otif_rate": "yes",
        "fin_cost_modeled": "yes", "fin_cash_runway": "yes",
        "prod_capacity_confirmed": "yes", "prod_lead_time": "yes",
        "comp_fsma_pcqi": "yes", "comp_allergens": "yes",
        "team_owner": "yes", "team_chargeback_process": "yes",
    }
    src = _write_answers(tmp_path, "walmart", answers)
    result = client_mode.run(cfg, src, str(tmp_path / "out"))
    assert result["status"] == "ok"
    assert result["warnings"] == 0
    assert "edi" in result["topBlockers"]


def test_final_flag_drops_watermark(cfg, tmp_path):
    src = _write_answers(tmp_path, "walmart", _FULL_WALMART)
    result = client_mode.run(cfg, src, str(tmp_path / "out"), final=True)
    html = Path(result["report"]).read_text(encoding="utf-8")
    assert "ll-draft" not in html


def test_bom_encoded_answer_file(cfg, tmp_path):
    src = _write_answers(tmp_path, "walmart", _FULL_WALMART, name="bom.json", encoding="utf-8-sig")
    result = client_mode.run(cfg, src, str(tmp_path / "out"))
    assert result["status"] == "ok"


def test_logo_embedded_as_data_uri(tmp_path):
    # 1x1 transparent PNG.
    png = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    (tmp_path / "logo.png").write_bytes(png)
    cfg_text = _CONFIG.replace("client: {name: Meridian Farms}",
                               "client: {name: Meridian Farms, logo: logo.png}")
    cfgp = tmp_path / "engagement.demo.yml"
    cfgp.write_text(cfg_text, encoding="utf-8")
    src = _write_answers(tmp_path, "walmart", _FULL_WALMART)
    result = client_mode.run(str(cfgp), src, str(tmp_path / "out"))
    html = Path(result["report"]).read_text(encoding="utf-8")
    assert "data:image/png;base64," in html


def test_wholeFoods_prohibited_ingredient_hard_gate(cfg, tmp_path):
    answers = {
        "pd_gtin_valid": "yes", "pd_hierarchy": "yes",
        "syn_gdsn_active": "yes", "syn_coverage": "yes",
        "edi_asn_capable": "yes", "edi_asn_timing": "yes", "edi_label_compliant": "yes",
        "ff_otif_rate": "yes",
        "fin_cost_modeled": "yes", "fin_cash_runway": "yes",
        "prod_capacity_confirmed": "yes", "prod_lead_time": "yes",
        "comp_ingredients": "yes", "comp_fsma_pcqi": "yes", "comp_gfsi_cert": "yes",
        "comp_allergens": "yes",
        "team_owner": "yes", "team_chargeback_process": "yes",
    }
    src = _write_answers(tmp_path, "wholeFoods", answers)
    result = client_mode.run(cfg, src, str(tmp_path / "out"))
    assert result["status"] == "ok"
    assert result["topBlockers"] == ["compliance"]


def test_empty_answers_object_blocks(cfg, tmp_path):
    src = _write_answers(tmp_path, "walmart", {})
    result = client_mode.run(cfg, src, str(tmp_path / "out"))
    assert result["status"] == "blocked"


def test_question_bank_matches_questions_js():
    """Guard client_mode.QUESTION_BANK against drift from src/data/questions.js:
    id, dimension, retailer set, and gate values must all match."""
    text = (REPO / "src" / "data" / "questions.js").read_text(encoding="utf-8")
    blocks = re.split(r"\{\s*\n\s*id:\s*'", text)
    js = {}
    for b in blocks[1:]:
        qid = b[: b.index("'")]
        dim = re.search(r"dimension:\s*'([^']+)'", b)
        rets = re.search(r"retailers:\s*\[([^\]]*)\]", b)
        gate = re.search(r"redGateValues:\s*\[([^\]]*)\]", b)
        if not (dim and rets):
            continue
        js[qid] = (
            dim.group(1),
            tuple(re.findall(r"'([^']+)'", rets.group(1))),
            tuple(re.findall(r"'([^']+)'", gate.group(1))) if gate else (),
        )

    bank = {q[0]: (q[1], q[2], q[3]) for q in client_mode.QUESTION_BANK}
    assert set(bank) == set(js), (
        f"question id drift: only in bank={set(bank) - set(js)}, only in js={set(js) - set(bank)}"
    )
    for qid, (dim, rets, gate) in js.items():
        b_dim, b_rets, b_gate = bank[qid]
        assert b_dim == dim, f"{qid}: dimension {b_dim} != {dim}"
        assert set(b_rets) == set(rets), f"{qid}: retailers {b_rets} != {rets}"
        assert set(b_gate) == set(gate), f"{qid}: gate values {b_gate} != {gate}"
