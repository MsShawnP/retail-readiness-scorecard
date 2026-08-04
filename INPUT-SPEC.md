# INPUT-SPEC — retail-readiness-scorecard (client mode)

What to hand the scorecard in a white-label engagement. The scorecard is
questionnaire-driven: the input is not a client data export but the **answer-set**
a consultant records from the readiness interview, plus the engagement config that
brands the deliverable. Written so the person running the engagement can produce
the file without a call.

## The answer file

- **JSON** (UTF-8, with or without BOM). One object, two keys: `retailer` and
  `answers`.
- `answers` maps a question id to one of exactly three values: `yes`, `partial`,
  `no`. No other value is accepted — anything else produces a **Data Readiness
  Report** instead of a scorecard (no silent coercion).

```json
{
  "retailer": "walmart",
  "answers": {
    "pd_gtin_valid": "yes",
    "pd_hierarchy": "partial",
    "pd_item360": "no",
    "syn_gdsn_active": "yes",
    "syn_coverage": "partial",
    "edi_asn_capable": "yes",
    "edi_asn_timing": "partial",
    "edi_fsma204": "no",
    "edi_label_compliant": "yes",
    "ff_otif_rate": "partial",
    "fin_cost_modeled": "yes",
    "fin_cash_runway": "no",
    "prod_capacity_confirmed": "yes",
    "prod_lead_time": "yes",
    "comp_fsma_pcqi": "yes",
    "comp_allergens": "partial",
    "team_owner": "yes",
    "team_chargeback_process": "partial"
  }
}
```

## `retailer` (required)

One of: `walmart` · `costco` · `wholeFoods`. Determines which questions apply and
which retailer-specific gates and thresholds are in force.

## `answers` — the eight dimensions

Every value is `yes` / `partial` / `no`. Which questions apply depends on the
retailer (the "Retailers" column). A **gate** answer forces its dimension to Red
(0) and the remaining questions in that dimension are not needed.

| Question id | Dimension | Retailers | Gate? | What it records |
|---|---|---|---|---|
| `pd_gtin_valid` | Product Data | all | `no` → Red | GTINs valid and registered in GS1 |
| `pd_hierarchy` | Product Data | all | — | Trade item hierarchy documented (each/inner/case) |
| `pd_item360` | Product Data | walmart | — | Item 360 attributes complete in Retail Link |
| `syn_gdsn_active` | Syndication | all | `no` → Red | Active 1WorldSync/GDSN account & connection |
| `syn_coverage` | Syndication | all | — | Launch SKUs fully syndicated |
| `edi_asn_capable` | EDI | all | `no` → Red | Can receive 850s and transmit 856 ASNs |
| `edi_asn_timing` | EDI | all | — | ASNs transmitted before gate-in |
| `edi_fsma204` | EDI | walmart | `no` → Red | FSMA 204 KDEs on every food/bev ASN (Aug 2025) |
| `edi_label_compliant` | EDI | all | — | GS1-128 / SSCC-18 labels compliant & match ASN |
| `ff_otif_rate` | Fulfillment | all | `no` → Red | OTIF at/above retailer threshold |
| `ff_thermal` | Fulfillment | costco | — | Thermal-transfer (not direct-thermal) label printing |
| `fin_cost_modeled` | Financial | all | `no` → Red | Year-one retailer cost model built |
| `fin_cash_runway` | Financial | all | — | 90-day cash runway incl. chargeback buffer |
| `prod_capacity_confirmed` | Production | all | `no` → Red | Co-packer capacity confirmed in writing |
| `prod_lead_time` | Production | all | — | Lead time fits the buyer's first-ship window |
| `comp_ingredients` | Compliance | wholeFoods | `yes` → Red | Product contains prohibited artificial ingredients |
| `comp_fsma_pcqi` | Compliance | all | — | FSMA PCQI documentation current |
| `comp_gfsi_cert` | Compliance | wholeFoods | `no` → Red | Current GFSI-benchmarked certification |
| `comp_allergens` | Compliance | all | — | Allergen declarations consistent across sources |
| `team_owner` | Team & Process | all | `no` → Red | Named owner of the retailer relationship |
| `team_chargeback_process` | Team & Process | all | — | Defined chargeback/deduction process with SLA |

**Note on `comp_ingredients`:** the gate value is `yes` (the product *does* contain
prohibited ingredients), not `no`. This is the only inverted gate.

## Completeness and preflight

Client mode runs a preflight before scoring:

- **Blocked → Data Readiness Report (no scorecard):** an invalid `retailer`; a
  malformed file; any answer value that is not `yes`/`partial`/`no`; or a missing
  **gate/primary** question for an applicable dimension (that dimension cannot be
  scored).
- **Proceed with warnings (disclosed):** a follow-up (non-gate) question left
  unanswered. The engine reads an unanswered follow-up as zero points; because that
  is an assumption, every such question is listed in the deliverable's **Data
  limitations** section and the report is stamped *proceeded with warnings*.
- **Clean:** every question applicable to the retailer is answered.

Questions that do not apply to the chosen retailer are ignored and disclosed.

## White-label config (engagement.yml)

The config brands the deliverable and stamps its provenance. No scoring value lives
here — thresholds and gates are the retailer's, encoded in the engine.

```yaml
client:
  name: "Meridian Farms"          # printed on every page
  logo: "client-data/logo.png"    # optional; embedded as a data URI (offline-safe)
engagement:
  id: "MER-2026-08"
as_of_date: "2026-07-31"          # required; never today's date
prepared_by: "Lailara LLC"
```

`as_of_date` is required and must be an explicit ISO date (`YYYY-MM-DD`). A
`config_hash` derived from these values is printed in the provenance footer so a
run is reproducible. `engagement.demo.yml` (shipped) is a safe, deployable demo
config (`demo: true`).

## Run

```bash
pip install -e ../engagement-template/lib      # once: installs lailara_engagement
python client_mode.py --config engagement.yml --input client-data/answers.json \
    --out client-output [--final]
```

Outputs to `client-output/` (gitignored):
- `scorecard-readiness-<retailer>.html` — branded, provenance-footed (input
  SHA-256, answered-question count, `as_of_date`, config hash, validation status),
  DRAFT-watermarked until `--final`.
- or `data-readiness-report.html` if the preflight blocks.
