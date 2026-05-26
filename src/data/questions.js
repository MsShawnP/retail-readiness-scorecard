/**
 * Question bank — all ~24 questions with retailer-specific text.
 *
 * Each question:
 *   id: string — unique, matches answer key in scoring.js
 *   dimension: string — one of the 8 DIMENSIONS
 *   isGate: boolean — if true, a 'no' answer triggers Red + skips follow-ups for this dimension
 *   retailers: string[] — which retailers this question applies to
 *   order: number — sort order within dimension (lower = asked first)
 *   text: { walmart, costco, wholeFoods } | string — retailer-specific or shared text
 *   options: array of { value, label } — exactly 3, ordered yes/partial/no
 *   redGateValues: string[] — answer values that trigger Red gate (usually ['no'])
 *
 * Gate questions with redGateValues: when answered with a gate value, the dimension
 * is scored Red (0) and all remaining questions for that dimension are skipped.
 */

export const QUESTIONS = [
  // ─── Product Data ────────────────────────────────────────────────────────

  {
    id: 'pd_gtin_valid',
    dimension: 'productData',
    isGate: true,
    redGateValues: ['no'],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 1,
    text: {
      walmart: 'Are all your GTINs valid and registered in the GS1 registry — confirmed, not assumed?',
      costco: 'Are all your GTINs valid and registered in the GS1 registry — confirmed, not assumed?',
      wholeFoods: 'Are all your GTINs valid and registered in the GS1 registry — confirmed, not assumed?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — all GTINs verified in the GS1 registry' } },
      { value: 'partial', label: { default: 'Partially — some SKUs confirmed, others need verification' } },
      { value: 'no', label: { default: 'No — GTINs not confirmed or not registered' } },
    ],
  },

  {
    id: 'pd_hierarchy',
    dimension: 'productData',
    isGate: false,
    redGateValues: [],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 2,
    text: {
      walmart: 'Is your trade item hierarchy fully documented — each unit, inner pack, and case — with accurate dimensions and weights for Item 360?',
      costco: 'Is your trade item hierarchy documented — each unit and case — with Costco\'s assigned item number?',
      wholeFoods: 'Is your trade item hierarchy documented, with product spec sheets ready for the Whole Foods supplier portal?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — complete and verified' } },
      { value: 'partial', label: { default: 'Partial — mostly complete but gaps remain' } },
      { value: 'no', label: { default: 'No — not yet documented' } },
    ],
  },

  {
    id: 'pd_item360',
    dimension: 'productData',
    isGate: false,
    redGateValues: [],
    retailers: ['walmart'],
    order: 3,
    text: {
      walmart: 'Are your Walmart Item 360 attributes complete in Retail Link — images, nutrition, allergens, e-commerce descriptions, and GDSN hierarchy data?',
    },
    options: [
      { value: 'yes', label: { walmart: 'Yes — Item 360 setup complete and approved' } },
      { value: 'partial', label: { walmart: 'Partial — in progress, some attributes missing' } },
      { value: 'no', label: { walmart: 'No — Item 360 not started or pending rejection' } },
    ],
  },

  // ─── Syndication ─────────────────────────────────────────────────────────

  {
    id: 'syn_gdsn_active',
    dimension: 'syndication',
    isGate: true,
    redGateValues: ['no'],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 1,
    text: {
      walmart: 'Do you have an active 1WorldSync account and GDSN connection to Walmart\'s Item 360 system?',
      costco: 'Do you have an active 1WorldSync account and GDSN connection to Costco\'s data system?',
      wholeFoods: 'Is your product data uploaded to the Whole Foods Supplier Portal — or do you have an active 1WorldSync account for syndication?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — active and connected' } },
      { value: 'partial', label: { default: 'Partial — account exists but data incomplete or not connected' } },
      { value: 'no', label: { default: 'No — no account or connection' } },
    ],
  },

  {
    id: 'syn_coverage',
    dimension: 'syndication',
    isGate: false,
    redGateValues: [],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 2,
    text: {
      walmart: 'Are all your launch SKUs fully syndicated with complete attributes in the Walmart GDSN system?',
      costco: 'Are all your launch SKUs fully syndicated to Costco\'s data system with complete attributes?',
      wholeFoods: 'Are all required attributes — images, nutrition, allergens, ingredients, certifications — complete and uploaded for your launch SKUs?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — all launch SKUs complete' } },
      { value: 'partial', label: { default: 'Partial — some SKUs syndicated, others in progress' } },
      { value: 'no', label: { default: 'No — syndication not started for launch SKUs' } },
    ],
  },

  // ─── EDI ─────────────────────────────────────────────────────────────────

  {
    id: 'edi_asn_capable',
    dimension: 'edi',
    isGate: true,
    redGateValues: ['no'],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 1,
    text: {
      walmart: 'Can you receive Walmart 850 purchase orders and transmit 856 ASNs electronically via AS2?',
      costco: 'Have you completed Costco\'s required EDI certification and can you send and receive Costco EDI documents (850 POs, 856 ASNs, 810 invoices)?',
      wholeFoods: 'Can you receive Whole Foods 850 purchase orders and transmit ASNs and 810 invoices electronically?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — fully capable and tested' } },
      { value: 'partial', label: { default: 'Partial — in setup or testing, not yet live' } },
      { value: 'no', label: { default: 'No — no EDI capability' } },
    ],
  },

  {
    id: 'edi_asn_timing',
    dimension: 'edi',
    isGate: false,
    redGateValues: [],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 2,
    text: {
      walmart: 'Are your ASNs transmitted and accepted by Walmart before the trailer gates at the DC — ideally within 30 minutes of carrier pickup?',
      costco: 'Are your ASNs transmitted before your physical goods arrive at the Costco depot — typically 2–4 hours before pickup?',
      wholeFoods: 'Are your ASNs transmitted before your physical goods arrive at the Whole Foods distribution center?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — consistently meeting the timing requirement' } },
      { value: 'partial', label: { default: 'Partial — timing is inconsistent or ASNs sometimes arrive late' } },
      { value: 'no', label: { default: 'No — ASNs typically sent after goods arrive' } },
    ],
  },

  {
    id: 'edi_fsma204',
    dimension: 'edi',
    isGate: false,
    redGateValues: [],
    retailers: ['walmart'],
    order: 3,
    text: {
      walmart: 'Do your Walmart ASNs include FSMA 204 Key Data Elements — required for all food and beverage shipments as of August 2025?',
    },
    options: [
      { value: 'yes', label: { walmart: 'Yes — FSMA 204 KDEs included in every ASN' } },
      { value: 'partial', label: { walmart: 'Partial — in progress, not consistently included' } },
      { value: 'no', label: { walmart: 'No — ASNs do not include FSMA 204 KDEs' } },
    ],
  },

  {
    id: 'edi_label_compliant',
    dimension: 'edi',
    isGate: false,
    redGateValues: [],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 4,
    text: {
      walmart: 'Are your GS1-128 shipping labels with SSCC-18 barcodes compliant — 4"×6", correct data fields, and exactly matching your ASN?',
      costco: 'Are your GS1-128 labels on two adjacent pallet sides, printed with thermal transfer (not direct thermal), with SSCC-18 matching your ASN?',
      wholeFoods: 'Are your GS1-128 shipping labels with SSCC-18 compliant and matching your ASN exactly?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — compliant and tested' } },
      { value: 'partial', label: { default: 'Partial — in progress or some gaps remain' } },
      { value: 'no', label: { default: 'No — labels not compliant or not yet implemented' } },
    ],
  },

  // ─── Fulfillment ──────────────────────────────────────────────────────────

  {
    id: 'ff_otif_rate',
    dimension: 'fulfillment',
    isGate: true,
    redGateValues: ['no'],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 1,
    text: {
      walmart: 'Is your current OTIF rate at or above Walmart\'s 98% composite threshold — measuring on-time and in-full at the PO level?',
      costco: 'Do you have a consistent documented history of on-time delivery within appointment windows — and can you produce that history for a Costco buyer?',
      wholeFoods: 'Do you actively track your on-time delivery performance — and do you have documented history you can share with a Whole Foods buyer?',
    },
    options: [
      {
        value: 'yes',
        label: {
          walmart: 'Yes — consistently at or above 98%',
          costco: 'Yes — consistent history, documented and on file',
          wholeFoods: 'Yes — we track OTIF and have documented history',
        },
      },
      {
        value: 'partial',
        label: {
          walmart: 'Partial — between 93–97%, working toward 98%',
          costco: 'Partial — mostly on-time but history is incomplete or inconsistent',
          wholeFoods: 'Partial — we track it informally but documentation is limited',
        },
      },
      {
        value: 'no',
        label: {
          walmart: 'No — below 93% or we don\'t track OTIF',
          costco: 'No — delivery history is undocumented or shows consistent failures',
          wholeFoods: 'No — we don\'t track on-time delivery performance',
        },
      },
    ],
  },

  // NOTE: ff_label_compliant removed — label compliance covered by edi_label_compliant.
  // This keeps the all-yes path at ≤18 questions per R7.

  {
    id: 'ff_thermal',
    dimension: 'fulfillment',
    isGate: false,
    redGateValues: [],
    retailers: ['costco'],
    order: 3,
    text: {
      costco: 'Are your shipping labels printed with thermal transfer printing — not direct thermal?',
    },
    options: [
      { value: 'yes', label: { costco: 'Yes — thermal transfer printing confirmed' } },
      { value: 'no', label: { costco: 'No — using direct thermal or unsure of printing method' } },
      { value: 'partial', label: { costco: 'Unsure — need to verify printing method with our label vendor' } },
    ],
  },

  // ─── Financial ────────────────────────────────────────────────────────────

  {
    id: 'fin_cost_modeled',
    dimension: 'financial',
    isGate: true,
    redGateValues: ['no'],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 1,
    text: {
      walmart: 'Have you built a full year-one Walmart cost model — including slotting fees, trade spend, 60–90 day payment terms, and chargeback reserves?',
      costco: 'Have you modeled year-one Costco costs — including trade investment, club-pack production, 90-day payment terms, and chargeback reserves?',
      wholeFoods: 'Have you modeled year-one Whole Foods costs — including slotting, demo requirements, trade spend, and 60-day payment terms?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — full cost model built and reviewed' } },
      { value: 'partial', label: { default: 'Partial — rough estimate but no full model' } },
      { value: 'no', label: { default: 'No — costs not modeled' } },
    ],
  },

  {
    id: 'fin_cash_runway',
    dimension: 'financial',
    isGate: false,
    redGateValues: [],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 2,
    text: {
      default: 'Do you have sufficient cash runway to cover the first 90 days of the launch — including initial production, slotting payments, and a chargeback buffer before your first payment lands?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — runway confirmed with buffer' } },
      { value: 'partial', label: { default: 'Partial — tight but manageable if nothing goes wrong' } },
      { value: 'no', label: { default: 'No — cash position is a constraint' } },
    ],
  },

  // ─── Production ───────────────────────────────────────────────────────────

  {
    id: 'prod_capacity_confirmed',
    dimension: 'production',
    isGate: true,
    redGateValues: ['no'],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 1,
    text: {
      walmart: 'Has your co-packer confirmed in writing that they can produce your projected Walmart launch volume on the required timeline?',
      costco: 'Has your co-packer confirmed capacity for your Costco club-pack configuration and launch volume — in writing?',
      wholeFoods: 'Has your co-packer confirmed capacity for your projected Whole Foods launch volume on the required timeline?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — confirmed in writing with production schedule' } },
      { value: 'partial', label: { default: 'Partial — verbal confirmation but no written commitment' } },
      { value: 'no', label: { default: 'No — capacity not confirmed' } },
    ],
  },

  {
    id: 'prod_lead_time',
    dimension: 'production',
    isGate: false,
    redGateValues: [],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 2,
    text: {
      default: 'Is your production lead time compatible with the buyer\'s required first-ship date — with enough time for a production run, QC hold, and inbound transit?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — lead time fits within the buyer\'s window' } },
      { value: 'partial', label: { default: 'Tight — could work but leaves no margin for delays' } },
      { value: 'no', label: { default: 'No — lead time exceeds the buyer\'s required window' } },
    ],
  },

  // ─── Compliance ───────────────────────────────────────────────────────────

  // Whole Foods prohibited ingredients gate — MUST be asked first for WFM
  {
    id: 'comp_ingredients',
    dimension: 'compliance',
    isGate: true,
    redGateValues: ['yes'], // Note: 'yes' is the gate trigger here — product DOES contain prohibited ingredients
    retailers: ['wholeFoods'],
    order: 0, // Float to first position for WFM
    text: {
      wholeFoods: 'Does your product contain any artificial colors, artificial flavors, or artificial preservatives?',
    },
    options: [
      { value: 'no', label: { wholeFoods: 'No — product contains none of these ingredients' } },
      { value: 'yes', label: { wholeFoods: 'Yes — product contains one or more prohibited ingredients' } },
      { value: 'partial', label: { wholeFoods: 'Unsure — need to verify against the Whole Foods prohibited ingredient list' } },
    ],
  },

  {
    id: 'comp_fsma_pcqi',
    dimension: 'compliance',
    isGate: false,
    redGateValues: [],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 1,
    text: {
      default: 'Is your FSMA Preventive Controls Qualified Individual (PCQI) documentation current, complete, and on file?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — documentation current and on file' } },
      { value: 'partial', label: { default: 'Partial — in progress or needs updating' } },
      { value: 'no', label: { default: 'No — PCQI documentation not in place' } },
    ],
  },

  {
    id: 'comp_gfsi_cert',
    dimension: 'compliance',
    isGate: true,
    redGateValues: ['no'],
    retailers: ['wholeFoods'],
    order: 2,
    text: {
      wholeFoods: 'Do you have a current GFSI-benchmarked food safety certification — SQF Level 2 or higher, BRCGS Food Safety, or equivalent?',
    },
    options: [
      { value: 'yes', label: { wholeFoods: 'Yes — current certification, not expired' } },
      { value: 'partial', label: { wholeFoods: 'Partial — certification in progress or recently expired' } },
      { value: 'no', label: { wholeFoods: 'No — no GFSI certification' } },
    ],
  },

  {
    id: 'comp_allergens',
    dimension: 'compliance',
    isGate: false,
    redGateValues: [],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 3,
    text: {
      default: 'Are your allergen declarations consistent across your product label, spec sheet, GDSN data, and any supplier portal entries?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — consistent across all touchpoints' } },
      { value: 'partial', label: { default: 'Partial — minor discrepancies that need reconciliation' } },
      { value: 'no', label: { default: 'No — inconsistencies exist' } },
    ],
  },

  // ─── Team & Process ───────────────────────────────────────────────────────

  {
    id: 'team_owner',
    dimension: 'team',
    isGate: true,
    redGateValues: ['no'],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 1,
    text: {
      walmart: 'Is there a named person on your team who owns the Walmart relationship day-to-day — handling portal issues, dispute windows, and buyer communications?',
      costco: 'Is there a named person on your team who owns the Costco relationship day-to-day — including EDI monitoring, appointment compliance, and buyer follow-up?',
      wholeFoods: 'Is there a named person on your team who owns the Whole Foods relationship day-to-day — handling portal updates, compliance documentation, and buyer communication?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — named owner, clear responsibility' } },
      { value: 'partial', label: { default: 'Partial — someone is handling it, but responsibility is shared or unclear' } },
      { value: 'no', label: { default: 'No — no one owns this relationship yet' } },
    ],
  },

  {
    id: 'team_chargeback_process',
    dimension: 'team',
    isGate: false,
    redGateValues: [],
    retailers: ['walmart', 'costco', 'wholeFoods'],
    order: 2,
    text: {
      walmart: 'Do you have a defined process for identifying, reviewing, and disputing Walmart chargebacks and deductions in Retail Link — with a response SLA?',
      costco: 'Do you have a defined process for tracking and disputing Costco chargebacks and deductions — with a clear response SLA?',
      wholeFoods: 'Do you have a defined process for tracking and disputing Whole Foods deductions and compliance issues?',
    },
    options: [
      { value: 'yes', label: { default: 'Yes — defined process with SLA' } },
      { value: 'partial', label: { default: 'Partial — informal process, no SLA' } },
      { value: 'no', label: { default: 'No — no defined chargeback process' } },
    ],
  },
];

/**
 * Get questions applicable to a specific retailer, sorted by dimension order.
 * @param {string} retailer
 * @returns {Array}
 */
export function getQuestionsForRetailer(retailer) {
  return QUESTIONS
    .filter(q => q.retailers.includes(retailer))
    .sort((a, b) => {
      if (a.dimension !== b.dimension) return 0; // dimension order handled by flow
      return a.order - b.order;
    });
}

/**
 * Get question text for a specific retailer.
 * Falls back to 'default' if retailer-specific text not defined.
 * @param {Object} question
 * @param {string} retailer
 * @returns {string}
 */
export function getQuestionText(question, retailer) {
  const text = question.text;
  if (typeof text === 'string') return text;
  return text[retailer] || text.default || '';
}

/**
 * Get option label for a specific retailer.
 * @param {Object} option
 * @param {string} retailer
 * @returns {string}
 */
export function getOptionLabel(option, retailer) {
  const label = option.label;
  if (typeof label === 'string') return label;
  return label[retailer] || label.default || '';
}
