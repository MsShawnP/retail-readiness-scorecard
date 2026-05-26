# Retailer Specs Research
*Researched: 2026-05-26. Verify before each build update — retailer requirements shift annually.*

---

## Confidence key

- **High** — Multiple corroborating sources, or official documentation
- **Moderate** — One strong source or consistent practitioner guidance
- **Low** — Single secondary source, unverified
- **Not found** — Not publicly available; must verify via supplier agreement or buyer contact

---

## Walmart (US Grocery / Consumables)

### OTIF
- **Threshold:** 98% composite. Sub-components: On-Time (prepaid/vendor-managed) = 90%; In-Full = 95%; On-Time (collect/Walmart-managed) = 98%. Suppliers are held against sub-metrics independently. [High]
- **Penalty:** 3% of COGS per non-compliant PO. Binary at PO level. Fines issued monthly, ~4-5 weeks post-month-end. [High]
- **Tracking:** Per PO / per shipment. Disputes via Retail Link within defined window. [High]
- **Note:** Thresholds can vary by category — verify in Retail Link for specific category.

### Product Data / GTIN
- **GTIN format:** GTIN-12 (UPC-A) for sellable units; GTIN-14 for cases. Inner-pack level not confirmed in public docs — verify. [High for each/case; Moderate for inner-pack]
- **GS1 Sunrise 2027:** Walmart aligned with 2D barcode transition (GS1 DataMatrix / QR with GS1 Digital Link). Hard enforcement month not published. Treat as directionally confirmed. [Moderate]
- **Item 360:** Proprietary item setup system. GDSN-driven via 1WorldSync. Required attributes: trade item hierarchy (each/inner/case), at least 1 product image (4-7 secondary recommended), e-commerce descriptions, full nutrition and allergen data. [High]
- **1WorldSync / GDSN:** Required. Cannot complete Item 360 setup without a 1WorldSync account. [High]

### EDI
- **Required sets:** 850 (PO inbound), 855 (PO Ack — 24hr), 856 (ASN — before gate-in), 810 (Invoice — 24hr), 997 (FA — bidirectional), 820 (Remittance inbound), 824 (Application Advice — flags ASN errors). [High]
- **Protocol:** AS2 required. [High]
- **ASN timing:** Must be transmitted and accepted BEFORE trailer gates at DC. Best practice: within 30 minutes of carrier pickup. No fixed-hour window in public docs — gate-in is the hard deadline. [Moderate]
- **FSMA 204:** As of August 1, 2025, all food/beverage suppliers must include FSMA 204 Key Data Elements in every ASN. [High — Walmart public documentation]

### Labeling
- **Shipping labels:** GS1-128 (UCC-128), 4"×6", SSCC-18 barcode. Must include: ship-to postal code, ship-from info, PO number, item description, quantity. SSCC must match ASN exactly. [High]
- **Pallets:** SSCC-18 required. Pallet stability and overhang standards enforced at DC. [High]

### Onboarding
- **Portal:** Item 360 via Retail Link (itemmanager.walmart.com). [High]
- **Timeline:** 4-12 weeks typical (not authoritatively published). Category buyer can accelerate or delay. [Low — practitioner estimate]
- **Common rejection causes:** Incomplete/mismatched GDSN attributes, missing product images, GTIN conflicts in GS1 registry, trade item hierarchy errors, missing regulatory attributes (nutrition, allergens). [High]

---

## Costco (US Wholesale)

### OTIF
- **Threshold:** **Not publicly disclosed.** No numerical OTIF floor equivalent to Walmart's 98%. Standard is appointment-window compliance: arrive within ±30 minutes of scheduled dock appointment. [Not found]
- **Penalty:** Incident-based chargebacks (not % of COGS): late/inaccurate ASN = $50-$200/incident; label mismatches = $50-$150/carton; data discrepancies (PO/ASN/invoice) = 1-3% of PO value; late documents = $100-$200/incident; quantity variance = 1-5% of affected items. [Moderate — third-party compliance guides; actual amounts in supplier contract]
- **Tracking:** Per appointment / per shipment. No weekly rolling score published. [Moderate]

### Product Data / GTIN
- **GTIN format:** Accurate scannable GTIN required at case level for ASN line items. Costco's assigned item number required on all products. [High — SEC-filed supplier agreement]
- **1WorldSync / GDSN:** Required per Basic Supplier Agreement. [High — sourced from SEC-filed agreement; confirm applies to your category/agreement version]
- **GS1 Sunrise 2027:** Not explicitly mentioned in Costco-specific public documentation. Assumed to follow GS1 industry direction given GDSN mandate. [Not confirmed]

### EDI
- **Required sets:** 850 (PO), 855 (PO Ack — 24hr), 856 (ASN — before physical arrival), 810 (Invoice — 24-48hr after ASN), 820 (Remittance), 832 (Price/Sales Catalog), 860 (PO Change), 997 (FA — bidirectional). [High]
- **Protocol:** VAN (most common), AS2 (high-volume suppliers), or SFTP/FTP. No mandated VAN provider. EDI certification testing with Costco required before go-live. [High]
- **ASN timing:** Must arrive before physical goods arrive at depot. Practitioner guidance: 2-4 hours pre-pickup. Hard rule: ASN before physical arrival. [Moderate — practitioner guidance, not published spec]
- **Note:** Costco's EDI specs are documented as notably different from Amazon/Walmart — common source of failure for first-timers. Get the current EDI spec document directly from Costco at onboarding.

### Labeling
- **Shipping labels:** GS1-128 on every case and pallet. Labels on two adjacent pallet sides. Thermal transfer printing required (direct thermal not accepted). SSCC must match ASN exactly. [High]
- **Club pack:** Buyer specifies configuration at negotiation. Must be ready for floor display — no repacking at the club. Each case opens to reveal product immediately ready for member purchase. [High]

### Onboarding
- **Portal:** None. No self-service path. All onboarding is buyer-driven via regional division offices. [High]
- **Process:** Phone inquiry to regional buyer → category evaluation → supplier agreement → EDI certification testing → test shipment → go-live. [High]
- **Timeline:** Not published. EDI certification step is commonly the longest gate. [Not found]
- **Common failure points:** ASN timing errors, labeling non-compliance, EDI document mapping failures (Costco specs differ from Walmart/Amazon), club-pack configuration mismatches. [High]

---

## Whole Foods Market (Amazon)

### OTIF
- **Threshold:** 97% cited by one secondary source (accio.com). No WFM-published documentation found to corroborate. [Low — single secondary source]
- **Penalty:** Not publicly documented. [Not found]
- **Tracking:** Not publicly documented. [Not found]
- **Scoring note:** Treat OTIF as a dimension for Whole Foods but use qualitative scoring (do you track OTIF? do you have documented history?) rather than threshold-based scoring until a confirmed number is available.

### Product Data / GTIN
- **GTIN format:** GS1-standard barcodes required. Specific format/placement not detailed in public documentation. [Moderate]
- **1WorldSync / GDSN:** Not confirmed in public sources. Not explicitly required in WFM-facing documentation found. [Not found — verify directly with WFM supplier team]
- **GS1 Sunrise 2027:** Not addressed in WFM-specific public documentation. [Not found]

### EDI
- **Required sets:** 850 (PO), 855 (PO Ack), 810 (Invoice), 997 (FA) confirmed. 856 (ASN) supported — FoodLogiQ used as traceability partner. [Moderate]
- **Protocol:** ANSI ASC X12 primary. UN/EDIFACT and XML also supported. [Moderate]
- **ASN timing:** Not publicly specified. [Not found]
- **VAN:** No mandated provider. Multiple integration providers offer pre-built WFM connections (TrueCommerce, Cleo, Zenbridge, Stacksync). [Moderate]

### Certification and Ingredient Requirements (key Whole Foods differentiator)
- **Food safety certification:** GFSI-benchmarked certification preferred (SQF, BRCGS). GMP certification as alternative. [High]
- **Ingredient compliance:** WFM publishes a prohibited ingredients list — products with listed ingredients are a hard rejection. Artificial colors, flavors, and preservatives are excluded. [High]
- **Organic:** Current USDA organic certification required for organic claims. Expired certs = hard rejection. [High]
- **Other certifications:** Non-GMO Project, Fair Trade, Rainforest Alliance, MSC, animal welfare certifications required where applicable by product type. [High]
- **Scoring note:** For Whole Foods, the Compliance dimension carries more weight than for Walmart or Costco. Prohibited ingredients and missing certifications are launch-blocking regardless of other readiness scores.

### Onboarding
- **Portal:** Whole Foods Market Supplier Portal. Initial entry via "Potential Supplier Form." For CPG brands in Grocery/Whole Body, the **LEAP program** provides a structured path. [High]
- **Timeline:** 90+ days published minimum across documented phases: documentation review (1-2 wks), sample testing (3-4 wks), facility audit (4-8 wks) — plus additional buyer review time. [Moderate]
- **Common rejection causes:** Prohibited ingredients, missing/expired certifications, failed food safety audit, incomplete/non-compliant labeling, weak OTIF history. [High]

---

## Scoring design implications

| Issue | Implication |
|---|---|
| Costco OTIF has no published % | Score this dimension on appointment compliance (does the brand have reliable on-time delivery history?), not against a specific %) |
| Whole Foods OTIF is unverified | Use qualitative framing: "Do you track OTIF?" + "Do you have documented delivery history?" — not "is your OTIF above X%?" |
| Whole Foods GDSN unconfirmed | Score syndication for WFM as "direct supplier portal upload" rather than GDSN-required; note GDSN as recommended |
| Whole Foods Compliance is a hard gate | Any prohibited ingredient or missing required certification = Red, regardless of all other scores. Make this a gate question before all other WFM dimensions. |
| Costco EDI specs differ from Walmart | Score EDI for Costco with specific note: "Having Walmart EDI capability does not mean you have Costco EDI capability — Costco's spec requires separate certification." |
| FSMA 204 in Walmart ASN (Aug 2025) | Add to Walmart EDI + Compliance dimensions: "Can your ASN include FSMA 204 Key Data Elements?" |

---

## Sources

- RetailPath: Walmart OTIF Fines Explained
- Zipline Logistics: Walmart OTIF 98% context and history
- Orderful: Walmart OTIF 2026 Guide
- CRSTL: Walmart EDI Requirements 2026 Complete Guide
- Inymbus: Walmart ASN Setup and Best Practices
- Walmart Public (food-safety): FSMA 204 Food Traceability requirements
- Productiv: GS1-128 Labeling for Retail
- GS1 US: Sunrise 2027 details
- 1WorldSync Community: Walmart Item 360 GDSN Setup training
- CRSTL: Costco EDI Requirements 2026
- Productiv: Costco Vendor Compliance
- BOLD VAN: Costco EDI Specifications, timing, common mistakes
- BOLD VAN: How to Become a Costco Supplier
- SEC filing (EDGA 1940372): Costco Basic Supplier Agreement — GTIN/GDSN clause
- Accio: Whole Foods Supplier Compliance Checklist (97% OTIF figure — low confidence)
- SPS Commerce: Whole Foods Supplier Portal Navigation
- TrueCommerce: Whole Foods EDI Integration
- Stacksync: Whole Foods EDI Integration
