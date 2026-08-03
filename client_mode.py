"""Client-mode CLI for the Retail Readiness Scorecard.

Wraps the Python scoring engine (``scoring_engine/score.py``, verified identical
to the canonical JS engine by ``scoring_engine/test_parity.py``) with the shared
``lailara_engagement`` scaffold so a readiness assessment can be turned into a
branded, white-label deliverable: the consultant records the interview answers in
a JSON file (see INPUT-SPEC.md), points the tool at an ``engagement.yml`` carrying
the client's name/logo, and gets a provenance-footed, draft-watermarked scorecard
report — written to ``client-output/`` only.

A preflight runs first. If the answer file can't be scored (bad retailer, invalid
value, or a missing gate/primary question) it produces a Data Readiness Report
instead of a scorecard. Unanswered follow-up questions are disclosed as warnings.

Usage:
    python client_mode.py --config engagement.yml --input client-data/answers.json \
        --out client-output [--final]
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import json
import mimetypes
import sys
from pathlib import Path

from lailara_engagement import build_provenance, load_config
from lailara_engagement import palette as P
from lailara_engagement.provenance import InputRef, Provenance

sys.path.insert(0, str(Path(__file__).resolve().parent / "scoring_engine"))
import score as ENGINE  # noqa: E402

TOOL = "retail-readiness-scorecard"
TOOL_VERSION = "1.0"

VALID_ANSWERS = {"yes", "partial", "no"}
RETAILER_NAMES = {"walmart": "Walmart", "costco": "Costco", "wholeFoods": "Whole Foods"}

DIMENSION_LABELS = {
    "productData": "Product Data",
    "syndication": "Syndication",
    "edi": "EDI Capability",
    "fulfillment": "Fulfillment",
    "financial": "Financial Readiness",
    "production": "Production Capacity",
    "compliance": "Compliance",
    "team": "Team & Process",
}
DIMENSION_ORDER = ENGINE.DIMENSIONS

# Question bank — the subset of src/data/questions.js metadata the preflight needs
# (id, dimension, retailers, gate flag). Kept in lockstep with questions.js by
# test_client_mode.py::test_question_bank_matches_questions_js.
# (id, dimension, retailers, gate_values)
QUESTION_BANK = [
    ("pd_gtin_valid", "productData", ("walmart", "costco", "wholeFoods"), ("no",)),
    ("pd_hierarchy", "productData", ("walmart", "costco", "wholeFoods"), ()),
    ("pd_item360", "productData", ("walmart",), ()),
    ("syn_gdsn_active", "syndication", ("walmart", "costco", "wholeFoods"), ("no",)),
    ("syn_coverage", "syndication", ("walmart", "costco", "wholeFoods"), ()),
    ("edi_asn_capable", "edi", ("walmart", "costco", "wholeFoods"), ("no",)),
    ("edi_asn_timing", "edi", ("walmart", "costco", "wholeFoods"), ()),
    ("edi_fsma204", "edi", ("walmart",), ("no",)),
    ("edi_label_compliant", "edi", ("walmart", "costco", "wholeFoods"), ()),
    ("ff_otif_rate", "fulfillment", ("walmart", "costco", "wholeFoods"), ("no",)),
    ("ff_thermal", "fulfillment", ("costco",), ()),
    ("fin_cost_modeled", "financial", ("walmart", "costco", "wholeFoods"), ("no",)),
    ("fin_cash_runway", "financial", ("walmart", "costco", "wholeFoods"), ()),
    ("prod_capacity_confirmed", "production", ("walmart", "costco", "wholeFoods"), ("no",)),
    ("prod_lead_time", "production", ("walmart", "costco", "wholeFoods"), ()),
    ("comp_ingredients", "compliance", ("wholeFoods",), ("yes",)),
    ("comp_fsma_pcqi", "compliance", ("walmart", "costco", "wholeFoods"), ()),
    ("comp_gfsi_cert", "compliance", ("wholeFoods",), ("no",)),
    ("comp_allergens", "compliance", ("walmart", "costco", "wholeFoods"), ()),
    ("team_owner", "team", ("walmart", "costco", "wholeFoods"), ("no",)),
    ("team_chargeback_process", "team", ("walmart", "costco", "wholeFoods"), ()),
]


class Preflight:
    """Result of validating an answer file against a retailer."""

    def __init__(self):
        self.errors: list[str] = []      # block -> Data Readiness Report
        self.warnings: list[str] = []    # proceed, disclosed in Data limitations
        self.retailer: str | None = None
        self.answers: dict[str, str] = {}

    @property
    def blocked(self) -> bool:
        return bool(self.errors)

    @property
    def status(self) -> str:
        if self.errors:
            return "failed"
        return "warnings" if self.warnings else "clean"


def _applicable(retailer: str):
    return [q for q in QUESTION_BANK if retailer in q[2]]


def preflight_answers(retailer, answers) -> Preflight:
    pf = Preflight()
    pf.retailer = retailer

    if retailer not in RETAILER_NAMES:
        pf.errors.append(
            f"`retailer` must be one of walmart / costco / wholeFoods — got {retailer!r}."
        )
        return pf
    if not isinstance(answers, dict):
        pf.errors.append("`answers` must be an object mapping question id -> yes/partial/no.")
        return pf

    applicable = _applicable(retailer)
    applicable_ids = {q[0] for q in applicable}

    # Invalid values (no silent coercion).
    for qid, val in answers.items():
        if val not in VALID_ANSWERS:
            pf.errors.append(
                f"`{qid}` = {val!r} is not a valid answer (must be yes / partial / no)."
            )

    # Unknown / inapplicable keys -> disclosed, ignored in scoring.
    for qid in answers:
        if qid not in applicable_ids:
            pf.warnings.append(
                f"`{qid}` is not a question for {RETAILER_NAMES[retailer]} — ignored."
            )

    # Completeness, walking each dimension in flow order (QUESTION_BANK is ordered).
    # A question is "asked" only until an earlier gate in that dimension trips; once
    # a provided answer trips a gate, the remaining questions are not required. An
    # unanswered gate question that WOULD be asked blocks (the dimension can't be
    # scored); an unanswered non-gate follow-up is a disclosed warning (the engine
    # reads it as not-in-place).
    by_dim: dict[str, list] = {}
    for q in applicable:
        by_dim.setdefault(q[1], []).append(q)
    for dim, qs in by_dim.items():
        tripped = False
        for qid, _dim, _ret, gate_vals in qs:
            val = answers.get(qid)
            answered = val in VALID_ANSWERS
            if tripped:
                continue  # dimension already gated upstream — not asked
            if not answered:
                if gate_vals:  # a gate question that would be asked — required
                    pf.errors.append(
                        f"`{qid}` (gate question for {DIMENSION_LABELS[dim]}) is missing — "
                        f"the dimension cannot be scored. See INPUT-SPEC.md."
                    )
                else:  # follow-up left blank — engine reads as not-in-place
                    pf.warnings.append(
                        f"`{qid}` ({DIMENSION_LABELS[dim]}) left unanswered — scored as not-in-place."
                    )
                continue
            if gate_vals and val in set(gate_vals):
                tripped = True

    if not pf.blocked:
        pf.answers = {q: v for q, v in answers.items() if v in VALID_ANSWERS}
    return pf


# ─── Report rendering ────────────────────────────────────────────────────────

_STATUS_STYLE = {
    "green": (P.LL_HK_SURFACE, P.LL_HK_DARK, "Green"),
    "yellow": (P.LL_SG_SURFACE, P.LL_SG_DARK, "Yellow"),
    "red": (P.LL_RED_SURFACE, P.LL_RED_DARK, "Red"),
}
_OVERALL_STYLE = {
    "ready": (P.LL_HK_SURFACE, P.LL_HK_DARK),
    "at-risk": (P.LL_SG_SURFACE, P.LL_SG_DARK),
    "not-ready": (P.LL_RED_SURFACE, P.LL_RED_DARK),
}


def _logo_data_uri(config) -> str | None:
    client = config.raw.get("client") or {}
    rel = client.get("logo")
    if not rel:
        return None
    path = (Path(config.source_path).parent / rel) if config.source_path else Path(rel)
    if not path.is_file():
        return None
    mime = mimetypes.guess_type(str(path))[0] or "image/png"
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def _css(draft: bool) -> str:
    draft_css = (
        ".ll-draft::before{content:'DRAFT';position:fixed;top:50%;left:50%;"
        "transform:translate(-50%,-50%) rotate(-32deg);font-family:var(--s);"
        "font-size:22vw;font-weight:700;color:rgba(204,16,10,.06);z-index:0;"
        "pointer-events:none;white-space:nowrap}" if draft else ""
    )
    return f"""
:root{{--s:{P.LL_SERIF};--f:{P.LL_SANS}}}
*{{box-sizing:border-box}}
body{{margin:0;background:{P.LL_CANVAS};color:{P.LL_TEXT};font-family:var(--f);line-height:1.6}}
.ll-page{{position:relative;z-index:1;max-width:{P.LL_MAX_WIDTH};margin:0 auto;padding:48px 24px}}
.ll-header{{border-bottom:1px solid {P.LL_GRIDLINE};padding-bottom:24px;margin-bottom:24px;
  display:flex;justify-content:space-between;align-items:flex-start;gap:24px}}
.ll-eyebrow{{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:{P.LL_RED};font-weight:600}}
.ll-title{{font-family:var(--s);font-weight:700;color:{P.LL_INK};font-size:34px;margin:8px 0 16px}}
.ll-logo{{max-height:56px;max-width:200px}}
.ll-client{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px 24px;font-size:14px}}
.ll-k{{display:block;color:{P.LL_TEXT_SEC};font-size:11px;text-transform:uppercase;letter-spacing:.04em}}
.ll-banner{{border-radius:2px;padding:16px 20px;margin-bottom:32px}}
.ll-verdict{{font-family:var(--s);font-weight:700;font-size:24px}}
.ll-h2{{font-family:var(--s);font-weight:700;color:{P.LL_INK};font-size:22px;margin:32px 0 12px;
  padding-bottom:6px;border-bottom:1px solid {P.LL_GRIDLINE}}}
.ll-dim{{border:1px solid {P.LL_GRIDLINE};border-radius:2px;padding:16px 20px;margin-bottom:12px}}
.ll-dim-head{{display:flex;justify-content:space-between;align-items:center;gap:12px}}
.ll-dim-name{{font-weight:600;font-size:16px}}
.ll-badge{{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;
  padding:3px 10px;border-radius:2px}}
.ll-score{{font-variant-numeric:tabular-nums;color:{P.LL_TEXT_SEC};font-size:13px}}
.ll-findings{{margin:10px 0 0;padding-left:18px;font-size:14px}}
.ll-findings li{{margin-bottom:4px}}
.ll-fix{{font-size:13px;color:{P.LL_TEXT_SEC};margin-top:8px}}
.ll-list{{font-size:14px;padding-left:18px}}
.ll-limits{{background:{P.LL_SURFACE};border-radius:2px;padding:16px 20px;font-size:14px}}
.mono{{font-family:ui-monospace,Consolas,monospace;font-size:12px}}
.num{{text-align:right;font-variant-numeric:tabular-nums}}
.ll-provenance{{margin-top:40px;background:{P.LL_CARD_BG};color:{P.LL_CARD_TEXT};padding:20px 24px;border-radius:2px;font-size:13px}}
.ll-prov-title{{font-family:var(--s);font-weight:700;font-size:16px;margin-bottom:8px}}
.ll-provenance div{{margin-bottom:4px;color:{P.LL_CARD_SUBTITLE}}}
.ll-provenance strong{{color:{P.LL_CARD_TEXT}}}
.ll-prov-inputs{{width:100%;border-collapse:collapse;margin-top:8px}}
.ll-prov-inputs th{{text-align:left;border-bottom:1px solid rgba(255,255,255,.12);padding:4px 8px;color:{P.LL_CARD_MUTED}}}
.ll-prov-inputs td{{padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.08);color:{P.LL_CARD_SUBTITLE}}}
.ll-prov-brand{{margin-top:12px;font-family:var(--s);color:{P.LL_CARD_MUTED}}}
{draft_css}
@media print{{body{{background:#fff}}}}
"""


def _client_block(config, logo_uri, retailer, *, title, subtitle_html) -> str:
    esc = html.escape
    logo = f'<img class=ll-logo src="{logo_uri}" alt="{esc(config.client_name)} logo">' if logo_uri else ""
    return f"""<header class=ll-header>
  <div>
    <div class=ll-eyebrow>Lailara LLC · Retail Readiness Scorecard</div>
    <h1 class=ll-title>{esc(title)}</h1>
    <div class=ll-client>
      <div><span class=ll-k>Client</span> {esc(config.client_name)}</div>
      <div><span class=ll-k>Engagement</span> {esc(config.engagement_id)}</div>
      <div><span class=ll-k>Target retailer</span> {esc(RETAILER_NAMES.get(retailer, retailer))}</div>
      <div><span class=ll-k>As of</span> {esc(config.as_of_date.isoformat())}</div>
    </div>
    {subtitle_html}
  </div>
  {logo}
</header>"""


def _scorecard_html(config, retailer, scores, top_blockers, verdict_data,
                    warnings, provenance: Provenance, *, draft: bool) -> str:
    esc = html.escape
    logo_uri = _logo_data_uri(config)
    fill, text = _OVERALL_STYLE.get(verdict_data["overallStatus"], (P.LL_SURFACE, P.LL_TEXT))

    dim_cards = []
    for dim in DIMENSION_ORDER:
        r = scores[dim]
        s_fill, s_text, s_label = _STATUS_STYLE[r["status"]]
        findings = r.get("findings") or []
        if not findings:
            findings = (["No critical gaps identified."] if r["status"] == "green"
                        else ["Below the retailer threshold — treat as a gap to close."])
        findings_html = "".join(f"<li>{esc(f)}</li>" for f in findings)
        fix = f'<div class=ll-fix><strong>Fix:</strong> {esc(r["fix"])}</div>' if r.get("fix") else ""
        dim_cards.append(f"""<div class=ll-dim>
  <div class=ll-dim-head>
    <span class=ll-dim-name>{esc(DIMENSION_LABELS[dim])}</span>
    <span><span class=ll-score>{r['numeric']}/100</span>
      <span class=ll-badge style="background:{s_fill};color:{s_text}">{s_label}</span></span>
  </div>
  <ul class=ll-findings>{findings_html}</ul>
  {fix}
</div>""")

    if top_blockers:
        blockers_html = "<ol class=ll-list>" + "".join(
            f"<li>{esc(DIMENSION_LABELS[d])}</li>" for d in top_blockers) + "</ol>"
    else:
        blockers_html = "<p>No launch-blocking gaps — every dimension is Green.</p>"

    limits_html = ""
    if warnings:
        items = "".join(f"<li>{esc(w)}</li>" for w in warnings)
        limits_html = f"""<h2 class=ll-h2>Data limitations</h2>
<div class=ll-limits>This scorecard proceeded with {len(warnings)} disclosed
assumption{'s' if len(warnings) != 1 else ''}:<ul class=ll-list>{items}</ul></div>"""

    draft_class = "ll-draft" if draft else ""
    subtitle = f'<div style="margin-top:8px;color:{P.LL_TEXT_SEC};font-size:14px">{esc(verdict_data["timeline"])}</div>'
    return f"""<!doctype html><html lang=en><head><meta charset=utf-8>
<meta name=viewport content="width=device-width, initial-scale=1">
<title>Retail Readiness — {esc(config.client_name)} · {esc(RETAILER_NAMES.get(retailer, retailer))}</title>
<style>{_css(draft)}</style></head>
<body class="{draft_class}"><main class=ll-page>
{_client_block(config, logo_uri, retailer, title="Retail Readiness Scorecard", subtitle_html=subtitle)}
<section class=ll-banner style="background:{fill};color:{text}">
  <div class=ll-verdict>{esc(verdict_data["verdict"])}</div>
</section>
<h2 class=ll-h2>Top priorities</h2>
{blockers_html}
<h2 class=ll-h2>Dimension detail</h2>
{''.join(dim_cards)}
{limits_html}
{provenance.to_html()}
</main></body></html>"""


def _readiness_report_html(config, retailer, pf: Preflight, provenance: Provenance,
                           *, draft: bool) -> str:
    esc = html.escape
    logo_uri = _logo_data_uri(config)
    errs = "".join(f"<li>{esc(e)}</li>" for e in pf.errors)
    warns = "".join(f"<li>{esc(w)}</li>" for w in pf.warnings)
    warn_block = f"<h2 class=ll-h2>Also disclosed</h2><ul class=ll-list>{warns}</ul>" if pf.warnings else ""
    draft_class = "ll-draft" if draft else ""
    subtitle = (f'<div style="margin-top:8px;color:{P.LL_RED_DARK};font-size:14px">'
                f'Data not ready — no scorecard produced.</div>')
    return f"""<!doctype html><html lang=en><head><meta charset=utf-8>
<meta name=viewport content="width=device-width, initial-scale=1">
<title>Data Readiness Report — {esc(config.client_name)}</title>
<style>{_css(draft)}</style></head>
<body class="{draft_class}"><main class=ll-page>
{_client_block(config, logo_uri, retailer, title="Data Readiness Report", subtitle_html=subtitle)}
<section class=ll-banner style="background:{P.LL_RED_SURFACE};color:{P.LL_RED_DARK}">
  <div class=ll-verdict>The answer file is not ready to score.</div>
</section>
<h2 class=ll-h2>What must be fixed</h2>
<ul class=ll-list>{errs}</ul>
{warn_block}
{provenance.to_html()}
</main></body></html>"""


# ─── Orchestration ───────────────────────────────────────────────────────────

def _read_input(input_path: str):
    raw = Path(input_path).read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    data = json.loads(raw.decode("utf-8-sig"))
    retailer = data.get("retailer")
    answers = data.get("answers", {})
    ref = InputRef(
        filename=Path(input_path).name,
        sha256=sha,
        n_rows=len(answers) if isinstance(answers, dict) else 0,
        n_cols=1,
    )
    return retailer, answers, ref


def run(config_path: str, input_path: str, out_dir: str, *, final: bool = False) -> dict:
    config = load_config(config_path)
    retailer, answers, input_ref = _read_input(input_path)
    pf = preflight_answers(retailer, answers)

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    if pf.status == "clean":
        validation = "clean"
    elif pf.status == "warnings":
        validation = f"proceeded with warnings ({len(pf.warnings)})"
    else:
        validation = "blocked — data not ready"

    provenance = build_provenance(
        tool=TOOL, tool_version=TOOL_VERSION, inputs=[input_ref], config=config,
        validation_status=validation,
    )

    if pf.blocked:
        report = _readiness_report_html(config, retailer, pf, provenance, draft=not final)
        path = out / "data-readiness-report.html"
        path.write_text(report, encoding="utf-8")
        return {"status": "blocked", "readiness_report": str(path), "report": str(path)}

    scores = ENGINE.compute_scores(pf.answers, retailer)
    top_blockers = ENGINE.get_top_blockers(scores)
    verdict_data = ENGINE.get_overall_verdict(scores, retailer)

    report = _scorecard_html(config, retailer, scores, top_blockers, verdict_data,
                             pf.warnings, provenance, draft=not final)
    path = out / f"scorecard-readiness-{retailer}.html"
    path.write_text(report, encoding="utf-8")

    return {
        "status": "ok",
        "retailer": retailer,
        "overallStatus": verdict_data["overallStatus"],
        "verdict": verdict_data["verdict"],
        "topBlockers": top_blockers,
        "warnings": len(pf.warnings),
        "report": str(path),
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        prog="scorecard client mode",
        description="Turn a readiness answer-set into a branded client scorecard.")
    ap.add_argument("--config", required=True)
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", default="client-output")
    ap.add_argument("--final", action="store_true")
    args = ap.parse_args(argv)
    result = run(args.config, args.input, args.out, final=args.final)
    if result["status"] == "blocked":
        print(f"BLOCKED — data not ready. See {result['readiness_report']}")
        return 3
    print(f"{result['verdict']} ({result['overallStatus']}); "
          f"{result['warnings']} warning(s)")
    print(f"report -> {result['report']}")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
