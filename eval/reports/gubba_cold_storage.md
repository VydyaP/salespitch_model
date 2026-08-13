# Gubba Cold Storage

| | |
|---|---|
| **Industry** | Cold storage — seed preservation, pharmaceutical/vaccine warehousing, food storage |
| **HQ** | Hyderabad/Secunderabad, Telangana, India |
| **Founded** | 1987 |
| **Size** | 17 cold storage facilities across Hyderabad and Aurangabad totaling 1.25 crore cubic feet capacity; ~83 employees as of Aug 2025; privately held, family-run since 1987 |

---

## Facts

- Gubba Cold Storage was Andhra Pradesh's first cold storage, started in 1987 by Gubba Nagender Rao, and has grown to 1.25 crore cubic feet of capacity across 17 cold storages in Hyderabad and Aurangabad. ([source](https://gubbagroup.com/about-gubba/))
- The company specializes in seed cold storage, pharmaceutical warehousing, and food preservation, is trusted by 500+ national-class brands, and operates a germplasm bank and biotech lab. ([source](https://gubbagroup.com/about-gubba/))
- Gubba's facilities are among the finest vaccine facilities in India, with a capacity of 3 crore vaccine doses, and developed dedicated COVID-19 vaccine storage with roughly 6,300 pallets split into chambers of 1,200 pallets each across 15-25°C, 2-8°C, and -20°C zones under one roof. ([source](https://www.itln.in/our-new-bonthapally-facility-can-be-central-warehousing-hub-for-covid19-vaccine-gubba-kiran-logistics))
- Gubba's facilities provide climate-controlled preservation across a temperature range of +20°C to -22°C, with relative humidity maintained between 40% and 90%. ([source](https://gubbagroup.com/about-gubba/))
- As of August 31, 2025, Gubba Cold Storage had 83 employees, a 3% year-over-year increase in headcount. ([source](https://tracxn.com/d/companies/gubba-cold-storage/__zPQ_DX5g_b4obs_6H95f81nxI0t0Hux73uDU0tuQWz8))
- Gubba Cold Storage uses FLIR thermal imaging cameras to verify and guarantee cold storage conditions, per a published FLIR case study on the company. ([source](https://www.flir.com/discover/instruments/building-diagnostics/gubba-cold-storage--uses-thermal-imaging-to-guarantee-best-cold-storage-conditions/))

---

## Gaps (3 found — 1 high, 2 medium)

### 🔴 [HIGH] Vaccine-grade storage verified by periodic thermal imaging, not continuous monitoring

Gubba runs multi-zone vaccine storage (15-25°C, 2-8°C, -20°C chambers) at a 3-crore-dose capacity, but its documented monitoring method is FLIR thermal-imaging inspections — a periodic diagnostic check, not continuous per-zone sensor coverage with instant deviation alerts. For vaccine-grade storage at this scale, a missed deviation between inspection cycles is a real compliance and product-loss risk.

**GND service:** Cold Chain Management (ThinxFresh)

> Based on: Gubba Cold Storage uses FLIR thermal imaging cameras to verify and guarantee cold storage conditions; Gubba's facilities developed dedicated COVID-19 vaccine storage with chambers across 15-25°C, 2-8°C, and -20°C zones.

### 🟠 [MEDIUM] Lean 83-person team spanning 17 facilities across two cities

With only 83 employees covering 17 cold storage sites in Hyderabad and Aurangabad, staff are almost certainly doing a meaningful share of monitoring and inspection manually. IoT-driven, real-time visibility would let this small team keep multi-site coverage without proportionally growing headcount as they expand.

**GND service:** Warehouse Management

> Based on: As of August 31, 2025, Gubba Cold Storage had 83 employees; the company operates 17 cold storages in Hyderabad and Aurangabad.

### 🟠 [MEDIUM] Multiple precision temperature/humidity zones under one roof need granular audit trails

Facilities spanning +20°C to -22°C with 40-90% humidity control, including dedicated vaccine chambers, imply several distinct compliance zones that each need their own deviation history for regulators (Schedule M, WHO-GDP). Without a stated per-zone digital audit trail, compiling that record for inspection is likely manual and slow.

**GND service:** Cold Chain Management (ThinxFresh)

> Based on: Gubba's facilities provide climate-controlled preservation across a temperature range of +20°C to -22°C, with relative humidity maintained between 40% and 90%.

---

## Pitch

**Angle:** Gubba built some of India's best vaccine-grade storage — multiple precision temperature zones, 3-crore-dose capacity — with a lean 83-person team spread across 17 facilities in two cities, and verifies conditions today with FLIR thermal-imaging spot checks rather than continuous per-zone monitoring. GND's ThinxFresh platform turns those periodic checks into live BLE/LoRa sensor feeds with instant deviation alerts and auto-generated compliance reports, giving a small team audit-ready coverage across every zone and site without adding headcount.

**Opener:** You've built some of India's best vaccine-grade storage — with a team of 83 running 17 facilities across two cities, how are you currently getting instant deviation alerts across every temperature zone?

