export type GNDService =
  | 'Cold Chain Management' |'Warehouse Management' |'Asset Tracking & Monitoring' |'Product Engineering' |'Platform';

export type Severity = 'high' | 'medium' | 'low';

export interface Fact {
  id: string;
  claim: string;
  source_snippet: string;
  source_url: string;
}

export type VerificationStatus = 'VERIFIED' | 'WEAK' | 'UNVERIFIED';

export interface Gap {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  gnd_service: GNDService;
  based_on_fact_id: string;
  // Computed by verify.py, a deterministic word-overlap check against the
  // sourced facts -- absent/null when no verification run exists.
  verification_status?: VerificationStatus | null;
}

export interface Pitch {
  angle: string;
  opener: string;
}

export interface Company {
  id: string;
  company_name: string;
  founded: string;
  hq: string;
  industry: string;
  size: string;
  website: string;
  linkedin_url: string;
  phone: string;
  researched_at: string;
  facts: Fact[];
  gaps: Gap[];
  pitch: Pitch;
}

export const MOCK_COMPANIES: Company[] = [
  {
    id: 'co-001',
    company_name: 'Frostbite Cold Storage Solutions',
    founded: '1997',
    hq: 'Warrington, United Kingdom',
    industry: 'Cold storage and emergency refrigeration services',
    size: 'Small (approx. 70 LinkedIn followers)',
    website: 'https://frostbiterefrigeration.co.uk',
    linkedin_url: 'https://uk.linkedin.com/company/frostbite-refrigeration-ltd',
    phone: 'Unknown',
    researched_at: '2026-08-16T09:14:00Z',
    facts: [
      {
        id: 'f-001-1',
        claim:
          'Frostbite provides emergency cold storage for hotels, restaurants, catering companies, event venues, supermarkets, food retailers, and commercial kitchens.',
        source_snippet:
          'We work with hotels, restaurants, catering companies, and event venues needing reliable cold storage at short notice. Our emergency breakdown service supports supermarkets, food retailers, and commercial kitchens when installed refrigeration fails.',
        source_url: 'https://uk.linkedin.com/company/frostbite-refrigeration-ltd',
      },
      {
        id: 'f-001-2',
        claim:
          'Frostbite has operated since 1997 and claims 4-hour delivery and installation for emergency cold storage.',
        source_snippet:
          "Frostbite Refrigeration has been the North West's emergency cold storage specialists since 1997. Trusted by McDonald's, KFC, NHS hospitals, major hotels and festival operators — we deliver and install within 4 hours of your call.",
        source_url: 'https://uk.linkedin.com/company/frostbite-refrigeration-ltd',
      },
    ],
    gaps: [
      {
        id: 'g-001-1',
        title: 'No real-time temperature monitoring on deployed units',
        detail:
          "Frostbite's emergency cold-storage units are deployed rapidly, but there is no evidence they capture live temperature data or send deviation alerts. For clients like NHS hospitals and food retailers, unmonitored temperature excursions carry both safety and regulatory risk.",
        severity: 'high',
        gnd_service: 'Cold Chain Management',
        based_on_fact_id: 'f-001-1',
      },
      {
        id: 'g-001-2',
        title: 'No automated compliance reporting',
        detail:
          'Operating across food service and healthcare sectors, Frostbite would be subject to UK Food Safety Act and NHS cold-chain protocols, yet there is no mention of automated temperature logs or compliance exports — these are typically manual or absent.',
        severity: 'high',
        gnd_service: 'Platform',
        based_on_fact_id: 'f-001-2',
      },
      {
        id: 'g-001-3',
        title: 'Fleet asset visibility across deployed units unknown',
        detail:
          'With rapid deployment across the North West, tracking which units are deployed where, their utilisation rate, and return scheduling appears to be handled manually — a clear opportunity for asset tracking.',
        severity: 'medium',
        gnd_service: 'Asset Tracking & Monitoring',
        based_on_fact_id: 'f-001-1',
      },
    ],
    pitch: {
      angle:
        "Frostbite's rapid-response cold-storage service is a natural fit for GND's ThinxFresh platform, which adds real-time temperature analytics, automated compliance reporting, and a single dashboard to keep every trailer and unit under constant watch — without changing Frostbite's existing deployment speed.",
      opener:
        "Hi [Name], I noticed Frostbite delivers emergency refrigeration within 4 hours — imagine coupling that speed with live temperature alerts and automated compliance dashboards so every NHS or food-retail client gets a documented cold-chain record.",
    },
  },
  {
    id: 'co-002',
    company_name: 'BlueDart Express',
    founded: '1983',
    hq: 'Mumbai, Maharashtra, India',
    industry: 'Express logistics and time-definite delivery',
    size: 'Large (DHL subsidiary, 11,000+ employees)',
    website: 'https://www.bluedart.com',
    linkedin_url: 'https://www.linkedin.com/company/blue-dart',
    phone: '+91-22-28396444',
    researched_at: '2026-08-15T14:22:00Z',
    facts: [
      {
        id: 'f-002-1',
        claim:
          'BlueDart operates a temperature-controlled logistics vertical called BlueDart ThermoNet covering 35,000+ pin codes across India.',
        source_snippet:
          'BlueDart ThermoNet offers end-to-end cold chain solutions with temperature-controlled packaging, real-time shipment visibility, and regulatory compliance support across 35,000+ pin codes.',
        source_url: 'https://www.bluedart.com/temperature-controlled-logistics',
      },
      {
        id: 'f-002-2',
        claim:
          'BlueDart handles pharmaceutical and life sciences shipments including vaccines, blood samples, and temperature-sensitive biologics.',
        source_snippet:
          'Our life sciences division handles vaccines, biologics, and diagnostic samples with validated cold-chain packaging and CDSCO-compliant documentation for pan-India delivery.',
        source_url: 'https://www.bluedart.com/life-sciences',
      },
      {
        id: 'f-002-3',
        claim:
          'BlueDart has invested in a proprietary shipment tracking portal but does not publicly reference IoT sensor integration at the package level.',
        source_snippet:
          'Track your shipment in real time through our web portal or mobile app using your waybill number. Proactive SMS and email notifications keep you informed at every milestone.',
        source_url: 'https://www.bluedart.com/tracking',
      },
    ],
    gaps: [
      {
        id: 'g-002-1',
        title: 'Package-level IoT sensor data absent from tracking portal',
        detail:
          "BlueDart's tracking is milestone-based (scan events), not continuous. There is no evidence of in-transit temperature or humidity sensors at the individual package level — a significant gap for pharmaceutical clients requiring WHO GDP-compliant data loggers.",
        severity: 'high',
        gnd_service: 'Cold Chain Management',
        based_on_fact_id: 'f-002-3',
      },
      {
        id: 'g-002-2',
        title: 'No public API for cold-chain data integration with pharma ERP',
        detail:
          "Pharma clients need cold-chain excursion data to flow directly into their SAP or Oracle ERP systems. BlueDart's portal is siloed — no published API or webhook integration for temperature log export, forcing manual reconciliation.",
        severity: 'high',
        gnd_service: 'Platform',
        based_on_fact_id: 'f-002-2',
      },
      {
        id: 'g-002-3',
        title: 'Warehouse dwell-time monitoring not mentioned',
        detail:
          'Across BlueDart\'s hub network, temperature-sensitive cargo may dwell in non-controlled environments between scans. There is no public reference to warehouse temperature monitoring at transit hubs — a blind spot for biologics.',
        severity: 'medium',
        gnd_service: 'Warehouse Management',
        based_on_fact_id: 'f-002-1',
      },
    ],
    pitch: {
      angle:
        "BlueDart's ThermoNet has the network coverage but lacks the sensor layer that pharma and biotech clients now demand. GND's ThinxFresh platform can bolt onto existing shipment workflows to deliver package-level temperature logs, automatic GDP compliance reports, and an open API so pharma clients can pull excursion data directly into their ERP — turning ThermoNet into a fully auditable cold chain.",
      opener:
        "Hi [Name], BlueDart ThermoNet covers 35,000+ pin codes — GND's ThinxFresh adds the package-level sensor layer and automatic GDP compliance export your pharma clients are starting to mandate.",
    },
  },
  {
    id: 'co-003',
    company_name: 'Lineage Logistics',
    founded: '2008',
    hq: 'Novi, Michigan, USA',
    industry: 'Temperature-controlled warehousing and logistics',
    size: 'Enterprise (80,000+ employees, 400+ facilities globally)',
    website: 'https://www.lineagelogistics.com',
    linkedin_url: 'https://www.linkedin.com/company/lineage-logistics',
    phone: '+1-248-449-6700',
    researched_at: '2026-08-14T11:05:00Z',
    facts: [
      {
        id: 'f-003-1',
        claim:
          'Lineage operates over 400 temperature-controlled warehouses across North America, Europe, Asia-Pacific, and the Middle East.',
        source_snippet:
          'With a global network of more than 400 strategically located facilities, Lineage provides end-to-end cold chain solutions that keep products safe from production to consumption across six continents.',
        source_url: 'https://www.lineagelogistics.com/about',
      },
      {
        id: 'f-003-2',
        claim:
          'Lineage has invested in automation including autonomous mobile robots (AMRs) and AI-driven warehouse management, but sensor-level cold-chain data is not publicly integrated into client-facing portals.',
        source_snippet:
          'Lineage\'s LinOS™ operating system connects our facilities with robotics, AI-driven slotting, and real-time inventory visibility. Our automation investments have reduced labour dependency and improved throughput by up to 30%.',
        source_url: 'https://www.lineagelogistics.com/technology',
      },
      {
        id: 'f-003-3',
        claim:
          'Lineage serves food manufacturers, retailers, and foodservice companies and is expanding into pharmaceutical cold chain.',
        source_snippet:
          'We serve the world\'s largest food manufacturers, retailers, and foodservice distributors — and are actively expanding our pharmaceutical and life sciences capabilities to meet growing GDP compliance requirements.',
        source_url: 'https://www.lineagelogistics.com/industries',
      },
    ],
    gaps: [
      {
        id: 'g-003-1',
        title: 'Client-facing temperature data access is not real-time',
        detail:
          "Despite LinOS™ internal instrumentation, Lineage's client portal does not expose real-time temperature or humidity readings at the pallet or product level. Clients in pharma expansion need this for GDP compliance.",
        severity: 'high',
        gnd_service: 'Cold Chain Management',
        based_on_fact_id: 'f-003-2',
      },
      {
        id: 'g-003-2',
        title: 'Pharmaceutical GDP compliance tooling is early-stage',
        detail:
          "Lineage explicitly states they are 'actively expanding' pharmaceutical capabilities — meaning existing compliance documentation infrastructure is immature relative to their food segment. GND's platform layer addresses exactly this gap.",
        severity: 'high',
        gnd_service: 'Platform',
        based_on_fact_id: 'f-003-3',
      },
      {
        id: 'g-003-3',
        title: 'Cross-facility asset tracking visibility for clients unclear',
        detail:
          "With 400+ facilities, clients moving product across multiple Lineage nodes lack a unified view of asset location and condition in transit between facilities. GND's asset tracking layer could bridge this.",
        severity: 'medium',
        gnd_service: 'Asset Tracking & Monitoring',
        based_on_fact_id: 'f-003-1',
      },
    ],
    pitch: {
      angle:
        "Lineage's scale is unmatched, but their pharma cold-chain expansion is moving faster than their compliance tooling. GND's platform layer can deliver the client-facing real-time temperature dashboards, GDP audit trails, and cross-facility asset visibility that Lineage's new pharma clients will mandate — without displacing LinOS™.",
      opener:
        "Hi [Name], Lineage is expanding into pharma cold chain — GND's platform can give your pharmaceutical clients the real-time GDP compliance dashboards and audit trails they need without replacing LinOS™.",
    },
  },
  {
    id: 'co-004',
    company_name: 'Kühne+Nagel International',
    founded: '1890',
    hq: 'Schindellegi, Switzerland',
    industry: 'Global freight forwarding and contract logistics',
    size: 'Enterprise (80,000+ employees, 1,300+ offices)',
    website: 'https://www.kuehne-nagel.com',
    linkedin_url: 'https://www.linkedin.com/company/kuehne-nagel',
    phone: '+41-41-786-9111',
    researched_at: '2026-08-13T08:45:00Z',
    facts: [
      {
        id: 'f-004-1',
        claim:
          'Kühne+Nagel operates KN PharmaChain, a GDP-compliant global pharmaceutical logistics service covering over 90 countries.',
        source_snippet:
          'KN PharmaChain provides end-to-end pharmaceutical logistics with GDP qualification, temperature-controlled air and sea freight, and continuous monitoring across more than 90 countries worldwide.',
        source_url: 'https://www.kuehne-nagel.com/en/industries/pharma-healthcare',
      },
      {
        id: 'f-004-2',
        claim:
          "Kühne+Nagel's KN FreightNet platform provides digital freight booking but cold-chain IoT sensor integration at the shipment level is not exposed to shippers.",
        source_snippet:
          'KN FreightNet gives you instant online quotes, booking, and tracking for sea freight shipments worldwide. Connect your systems via our open API for seamless logistics integration.',
        source_url: 'https://www.kuehne-nagel.com/en/solutions/sea-logistics/kn-freightnet',
      },
    ],
    gaps: [
      {
        id: 'g-004-1',
        title: 'Shipper-level IoT data not surfaced via API',
        detail:
          'KN PharmaChain uses temperature data loggers internally but does not expose continuous sensor streams to shippers via the FreightNet API. Pharma clients wanting to ingest this data into their own QMS systems must rely on PDF reports post-delivery.',
        severity: 'high',
        gnd_service: 'Platform',
        based_on_fact_id: 'f-004-2',
      },
      {
        id: 'g-004-2',
        title: 'Emerging-market cold-chain infrastructure gaps',
        detail:
          'KN PharmaChain covers 90+ countries but cold-chain infrastructure quality varies significantly in South/Southeast Asia and Sub-Saharan Africa — markets where GND has IoT hardware deployment experience.',
        severity: 'medium',
        gnd_service: 'Product Engineering',
        based_on_fact_id: 'f-004-1',
      },
    ],
    pitch: {
      angle:
        "KN PharmaChain has the global network and GDP credentials, but pharma shippers increasingly demand live sensor data in their own QMS — not a PDF 48 hours post-delivery. GND's platform layer can connect KN's internal temperature loggers to a shipper-facing API, closing the data-access gap without changing KN's field operations.",
      opener:
        "Hi [Name], KN PharmaChain covers 90 countries — GND can add the shipper-facing sensor data API that your pharma clients need to close their QMS loop without waiting for post-delivery PDFs.",
    },
  },
  {
    id: 'co-005',
    company_name: 'Snowman Logistics',
    founded: '1993',
    hq: 'Bengaluru, Karnataka, India',
    industry: 'Temperature-controlled warehousing and distribution',
    size: 'Mid-size (NSE-listed, 2,000+ employees)',
    website: 'https://www.snowman.in',
    linkedin_url: 'https://www.linkedin.com/company/snowman-logistics',
    phone: '+91-80-41553636',
    researched_at: '2026-08-12T16:30:00Z',
    facts: [
      {
        id: 'f-005-1',
        claim:
          'Snowman operates 40+ temperature-controlled warehouses across 15 cities in India, with a total capacity exceeding 100,000 pallets.',
        source_snippet:
          'Snowman Logistics operates a pan-India network of 40+ temperature-controlled warehouses in 15 cities, with total storage capacity of over 100,000 pallets across ambient, chilled, and frozen zones.',
        source_url: 'https://www.snowman.in/about-us',
      },
      {
        id: 'f-005-2',
        claim:
          "Snowman uses a warehouse management system but has not publicly disclosed IoT temperature sensor integration or real-time client-facing dashboards.",
        source_snippet:
          'Our operations are managed through an integrated warehouse management system that tracks inventory, inbound and outbound movements, and billing — ensuring accuracy and efficiency at every facility.',
        source_url: 'https://www.snowman.in/technology',
      },
      {
        id: 'f-005-3',
        claim:
          'Snowman serves FMCG, dairy, seafood, pharmaceutical, and quick-service restaurant clients including major multinational brands.',
        source_snippet:
          'We serve leading FMCG, dairy, seafood processing, pharmaceutical, and QSR companies including multinational brands requiring consistent cold-chain standards across India.',
        source_url: 'https://www.snowman.in/clients',
      },
    ],
    gaps: [
      {
        id: 'g-005-1',
        title: 'No real-time temperature dashboard for clients',
        detail:
          "Snowman's WMS handles inventory movements but there is no evidence of a client-facing real-time temperature monitoring portal. Pharma and dairy clients operating under FSSAI and CDSCO mandates increasingly require continuous temperature records.",
        severity: 'high',
        gnd_service: 'Cold Chain Management',
        based_on_fact_id: 'f-005-2',
      },
      {
        id: 'g-005-2',
        title: 'WMS lacks IoT sensor integration layer',
        detail:
          "Snowman's WMS is inventory-centric, not sensor-centric. Integrating IoT temperature and humidity sensors across 40+ warehouses and surfacing that data to clients requires a platform layer that Snowman has not yet built.",
        severity: 'high',
        gnd_service: 'Warehouse Management',
        based_on_fact_id: 'f-005-2',
      },
      {
        id: 'g-005-3',
        title: 'Reefer fleet telematics not mentioned',
        detail:
          'Snowman operates a reefer transport fleet for distribution, but there is no public reference to vehicle telematics or in-transit temperature tracking — a gap that becomes critical for pharmaceutical last-mile delivery.',
        severity: 'medium',
        gnd_service: 'Asset Tracking & Monitoring',
        based_on_fact_id: 'f-005-1',
      },
    ],
    pitch: {
      angle:
        "Snowman has the pan-India network and the client roster, but its technology layer is inventory-management-first, not sensor-first. GND's ThinxFresh and WMS integration can add real-time temperature dashboards for Snowman's pharma and dairy clients, automated FSSAI compliance exports, and reefer telematics — turning Snowman's network into a fully auditable cold chain.",
      opener:
        "Hi [Name], Snowman has 40+ warehouses and marquee FMCG and pharma clients — GND can add the real-time temperature dashboards and automated FSSAI compliance reports your clients are starting to ask for.",
    },
  },
  {
    id: 'co-006',
    company_name: 'Nippon Express',
    founded: '1937',
    hq: 'Minato, Tokyo, Japan',
    industry: 'Global freight forwarding and 3PL logistics',
    size: 'Enterprise (70,000+ employees, 40+ countries)',
    website: 'https://www.nipponexpress.com',
    linkedin_url: 'https://www.linkedin.com/company/nippon-express',
    phone: '+81-3-6251-1111',
    researched_at: '2026-08-11T10:15:00Z',
    facts: [
      {
        id: 'f-006-1',
        claim:
          'Nippon Express operates a pharmaceutical logistics division with temperature-controlled air freight and ground distribution across Asia-Pacific, Europe, and the Americas.',
        source_snippet:
          'NX PharmaLogi provides temperature-controlled pharmaceutical logistics with GDP-compliant air freight, ground distribution, and warehousing across 40+ countries in Asia-Pacific, Europe, and the Americas.',
        source_url: 'https://www.nipponexpress.com/service/pharma/',
      },
      {
        id: 'f-006-2',
        claim:
          'Nippon Express is investing in digital transformation under its NX-ONE platform but cold-chain sensor data integration with client systems is not yet publicly available.',
        source_snippet:
          'NX-ONE is our unified digital platform that integrates shipment visibility, document management, and customer communication across all business units globally. We are currently expanding its capabilities to include real-time sensor data feeds.',
        source_url: 'https://www.nipponexpress.com/news/digital-transformation',
      },
    ],
    gaps: [
      {
        id: 'g-006-1',
        title: 'NX-ONE sensor data integration still in development',
        detail:
          "Nippon Express explicitly states NX-ONE's real-time sensor data feed is being expanded — meaning it's not yet available to clients. This is a live gap where GND's platform layer could accelerate delivery of this capability.",
        severity: 'high',
        gnd_service: 'Platform',
        based_on_fact_id: 'f-006-2',
      },
      {
        id: 'g-006-2',
        title: 'India sub-continent cold-chain infrastructure thin',
        detail:
          'Nippon Express has limited ground distribution infrastructure in India relative to its Asia-Pacific footprint — a market where GND has deep cold-chain hardware and software deployment experience.',
        severity: 'medium',
        gnd_service: 'Product Engineering',
        based_on_fact_id: 'f-006-1',
      },
    ],
    pitch: {
      angle:
        "Nippon Express is mid-build on NX-ONE's sensor data capability — GND's platform can accelerate that delivery with a proven IoT integration layer, reducing time-to-market for NX PharmaLogi's real-time monitoring promise to clients.",
      opener:
        "Hi [Name], NX-ONE's sensor feed is still in development — GND's platform integration layer can help Nippon Express deliver real-time cold-chain visibility to pharma clients months ahead of schedule.",
    },
  },
  {
    id: 'co-007',
    company_name: 'Riviera Cold Chain',
    founded: '2015',
    hq: 'Dubai, United Arab Emirates',
    industry: 'Pharmaceutical and food cold-chain logistics',
    size: 'Small-mid (approx. 250 employees)',
    website: 'https://www.rivieracoldchain.com',
    linkedin_url: 'https://www.linkedin.com/company/riviera-cold-chain',
    phone: '+971-4-8832200',
    researched_at: '2026-08-10T13:40:00Z',
    facts: [
      {
        id: 'f-007-1',
        claim:
          'Riviera Cold Chain operates temperature-controlled warehouses and last-mile delivery for pharmaceutical distributors and food manufacturers in the UAE and GCC region.',
        source_snippet:
          'Riviera Cold Chain provides temperature-controlled warehousing, distribution, and last-mile delivery for pharmaceutical companies, food manufacturers, and FMCG distributors across UAE and the GCC.',
        source_url: 'https://www.rivieracoldchain.com/services',
      },
      {
        id: 'f-007-2',
        claim:
          'Riviera Cold Chain holds GDP and HACCP certifications but relies on manual temperature logging at key checkpoints rather than continuous IoT monitoring.',
        source_snippet:
          'We maintain GDP and HACCP certifications with rigorous temperature logging at all critical control points — documented at intake, during storage, and at dispatch for every pharmaceutical consignment.',
        source_url: 'https://www.rivieracoldchain.com/compliance',
      },
    ],
    gaps: [
      {
        id: 'g-007-1',
        title: 'Manual temperature logging at checkpoints — not continuous',
        detail:
          'Riviera explicitly documents temperature at "critical control points" — intake, storage, dispatch — rather than continuously. Between checkpoints, excursions go undetected. Regulators and pharma clients are moving toward continuous monitoring mandates.',
        severity: 'high',
        gnd_service: 'Cold Chain Management',
        based_on_fact_id: 'f-007-2',
      },
      {
        id: 'g-007-2',
        title: 'No mention of real-time client visibility portal',
        detail:
          'Riviera has no public reference to a client portal for live shipment temperature visibility. GCC pharmaceutical distributors increasingly require this for regulatory submissions to UAE MOHAP.',
        severity: 'medium',
        gnd_service: 'Platform',
        based_on_fact_id: 'f-007-1',
      },
    ],
    pitch: {
      angle:
        "Riviera's GDP and HACCP certifications are strong, but checkpoint-based logging leaves temperature gaps that continuous IoT monitoring closes. GND's ThinxFresh can replace manual logs with automated continuous records and a client-facing portal — strengthening Riviera's compliance position with UAE MOHAP and pharma clients simultaneously.",
      opener:
        "Hi [Name], Riviera's GDP certification is solid — GND's ThinxFresh can upgrade from checkpoint logs to continuous monitoring and give your pharma clients a live compliance portal for UAE MOHAP submissions.",
    },
  },
  {
    id: 'co-008',
    company_name: 'Panalpina Cold Chain (now DSV)',
    founded: '1935',
    hq: 'Hedehusene, Denmark',
    industry: 'Air and sea freight forwarding, temperature-controlled logistics',
    size: 'Enterprise (75,000+ employees post-merger)',
    website: 'https://www.dsv.com',
    linkedin_url: 'https://www.linkedin.com/company/dsv',
    phone: '+45-43-20-30-40',
    researched_at: '2026-08-09T09:00:00Z',
    facts: [
      {
        id: 'f-008-1',
        claim:
          'DSV (incorporating Panalpina) operates DSV Cold Chain Solutions for pharmaceutical air freight with temperature-controlled handling at 100+ airports globally.',
        source_snippet:
          'DSV Cold Chain Solutions provides temperature-controlled air freight for pharmaceutical and life sciences products across 100+ airport stations globally, with dedicated pharma handling centers in Copenhagen, Frankfurt, Brussels, and Singapore.',
        source_url: 'https://www.dsv.com/en/solutions/industries/pharma',
      },
      {
        id: 'f-008-2',
        claim:
          'DSV uses passive temperature data loggers for pharmaceutical shipments but does not offer active IoT monitoring with real-time alerts to shippers in transit.',
        source_snippet:
          'All pharmaceutical shipments are accompanied by calibrated temperature data loggers. Post-delivery reports are generated within 24 hours of arrival confirming temperature compliance throughout the journey.',
        source_url: 'https://www.dsv.com/en/solutions/industries/pharma/cold-chain-compliance',
      },
    ],
    gaps: [
      {
        id: 'g-008-1',
        title: 'Passive loggers only — no real-time in-transit alerts',
        detail:
          'DSV uses passive loggers with post-delivery reports. For time-sensitive biologics and vaccines, a 24-hour lag in excursion detection is operationally unacceptable. Active IoT with real-time alerting is the next generation standard.',
        severity: 'high',
        gnd_service: 'Cold Chain Management',
        based_on_fact_id: 'f-008-2',
      },
      {
        id: 'g-008-2',
        title: 'No shipper-integrated real-time temperature API',
        detail:
          'Post-delivery PDF reports are the only data output. Pharma shippers wanting to integrate temperature data into their QMS or ERP in real time have no mechanism to do so with DSV\'s current offering.',
        severity: 'high',
        gnd_service: 'Platform',
        based_on_fact_id: 'f-008-2',
      },
    ],
    pitch: {
      angle:
        "DSV's 100-airport network is world-class, but passive logger + 24-hour PDF is becoming a compliance liability as pharma clients move to real-time QMS integration. GND's active IoT layer and platform API can upgrade DSV's cold-chain offering to continuous monitoring and live shipper data feeds — without replacing DSV's existing handling infrastructure.",
      opener:
        "Hi [Name], DSV's pharma cold-chain network covers 100 airports — GND can upgrade from passive loggers to active real-time monitoring and give your pharma clients a live API feed for their QMS.",
    },
  },
  {
    id: 'co-009',
    company_name: 'Thermo King Australia',
    founded: '1938',
    hq: 'Sydney, New South Wales, Australia',
    industry: 'Transport refrigeration systems and services',
    size: 'Mid-size (Trane Technologies subsidiary, ~500 local employees)',
    website: 'https://www.thermoking.com.au',
    linkedin_url: 'https://www.linkedin.com/company/thermo-king',
    phone: '+61-2-9748-2222',
    researched_at: '2026-08-08T07:30:00Z',
    facts: [
      {
        id: 'f-009-1',
        claim:
          'Thermo King Australia sells and services transport refrigeration units for trucks, trailers, and vans across Australian food and pharmaceutical distribution.',
        source_snippet:
          'Thermo King Australia provides sales, installation, and aftermarket servicing of transport refrigeration units for the food distribution, pharmaceutical, and retail sectors across all major Australian states.',
        source_url: 'https://www.thermoking.com.au/about',
      },
      {
        id: 'f-009-2',
        claim:
          "Thermo King's TracKing telematics platform provides vehicle location and unit status but does not offer product-level temperature monitoring inside the cargo space.",
        source_snippet:
          "TracKing gives fleet managers live GPS location, unit run status, fuel consumption, and fault code alerts for every Thermo King unit in the fleet — accessible via web and mobile app.",
        source_url: 'https://www.thermoking.com.au/tracking',
      },
    ],
    gaps: [
      {
        id: 'g-009-1',
        title: 'TracKing monitors the unit — not the cargo',
        detail:
          'TracKing tracks refrigeration unit run status and GPS, but does not monitor temperature at the product or pallet level inside the cargo space. For pharmaceutical and food clients, cargo-level temperature records are what regulators require.',
        severity: 'high',
        gnd_service: 'Cold Chain Management',
        based_on_fact_id: 'f-009-2',
      },
      {
        id: 'g-009-2',
        title: 'No automated compliance report generation',
        detail:
          'Thermo King Australia has no reference to automated FSANZ or TGA compliance report generation. Fleet operators using Thermo King units for pharmaceutical delivery must assemble compliance documentation manually.',
        severity: 'medium',
        gnd_service: 'Platform',
        based_on_fact_id: 'f-009-1',
      },
    ],
    pitch: {
      angle:
        "Thermo King's TracKing covers the unit layer — GND's ThinxFresh adds the cargo layer, placing sensors inside the load space and generating automated FSANZ and TGA compliance reports. Together, they give fleet operators a complete picture from engine room to product.",
      opener:
        "Hi [Name], TracKing already monitors your Thermo King units — GND's ThinxFresh adds cargo-level temperature sensors and automated FSANZ compliance reports so your pharmaceutical clients have a complete audit trail.",
    },
  },
  {
    id: 'co-010',
    company_name: 'Frigo-Trans GmbH',
    founded: '1972',
    hq: 'Mannheim, Baden-Württemberg, Germany',
    industry: 'Temperature-controlled transport and warehousing',
    size: 'Mid-size (BLG Logistics subsidiary, ~1,200 employees)',
    website: 'https://www.frigo-trans.de',
    linkedin_url: 'https://www.linkedin.com/company/frigo-trans',
    phone: '+49-621-3005-0',
    researched_at: '2026-08-07T15:20:00Z',
    facts: [
      {
        id: 'f-010-1',
        claim:
          'Frigo-Trans operates temperature-controlled transport across Germany and Europe with a fleet of 600+ reefer vehicles and 11 cold-storage locations.',
        source_snippet:
          'Frigo-Trans operates a fleet of more than 600 temperature-controlled vehicles and 11 cold-storage facilities across Germany and key European markets, serving food manufacturers, pharmaceutical companies, and retail chains.',
        source_url: 'https://www.frigo-trans.de/en/company',
      },
      {
        id: 'f-010-2',
        claim:
          'Frigo-Trans uses temperature monitoring on vehicles but client-facing real-time data access and automated excursion reporting are not publicly available.',
        source_snippet:
          'All Frigo-Trans vehicles are equipped with calibrated temperature recording systems. Our quality management team reviews temperature data for every pharmaceutical and sensitive food transport.',
        source_url: 'https://www.frigo-trans.de/en/quality',
      },
    ],
    gaps: [
      {
        id: 'g-010-1',
        title: 'Temperature data reviewed internally — not shared with clients in real time',
        detail:
          'Frigo-Trans monitors temperature but keeps the data internal for QM review. Clients cannot access live or historical temperature records via a portal — a growing requirement under EU GDP guidelines for pharmaceutical transport.',
        severity: 'high',
        gnd_service: 'Cold Chain Management',
        based_on_fact_id: 'f-010-2',
      },
      {
        id: 'g-010-2',
        title: 'No automated EU GDP compliance report delivery to pharma clients',
        detail:
          'EU GDP guidelines require pharmaceutical clients to receive temperature excursion reports promptly. Frigo-Trans\'s internal QM review process is manual, creating delays and potential compliance risk for their pharma shippers.',
        severity: 'high',
        gnd_service: 'Platform',
        based_on_fact_id: 'f-010-2',
      },
      {
        id: 'g-010-3',
        title: 'Fleet utilisation visibility across 600+ vehicles unclear',
        detail:
          'With 600+ reefer vehicles, fleet utilisation optimisation and predictive maintenance scheduling would benefit from a unified asset tracking layer — no such platform is referenced publicly.',
        severity: 'low',
        gnd_service: 'Asset Tracking & Monitoring',
        based_on_fact_id: 'f-010-1',
      },
    ],
    pitch: {
      angle:
        "Frigo-Trans has the European reefer network and the internal temperature discipline — but the data stays internal. GND's platform layer turns that internal data into client-facing real-time dashboards and automated EU GDP compliance reports, making Frigo-Trans the most transparent cold-chain partner in their competitive set.",
      opener:
        "Hi [Name], Frigo-Trans already records temperature on every pharmaceutical run — GND can surface that data to your clients as real-time dashboards and automated EU GDP compliance reports.",
    },
  },
  {
    id: 'co-011',
    company_name: 'Coldex Logistics',
    founded: '2008',
    hq: 'Singapore',
    industry: 'Cold-chain logistics and pharmaceutical distribution',
    size: 'Small-mid (approx. 180 employees)',
    website: 'https://www.coldexlogistics.com.sg',
    linkedin_url: 'https://www.linkedin.com/company/coldex-logistics',
    phone: '+65-6861-8888',
    researched_at: '2026-08-06T11:55:00Z',
    facts: [
      {
        id: 'f-011-1',
        claim:
          'Coldex Logistics is HSA-licensed for pharmaceutical distribution in Singapore and operates temperature-controlled warehousing and last-mile delivery.',
        source_snippet:
          'Coldex Logistics holds a Health Sciences Authority (HSA) wholesale dealer licence and operates GDP-compliant temperature-controlled warehousing and last-mile pharmaceutical delivery across Singapore.',
        source_url: 'https://www.coldexlogistics.com.sg/about',
      },
      {
        id: 'f-011-2',
        claim:
          'Coldex uses a fleet of temperature-controlled vehicles but has no publicly referenced real-time temperature monitoring system or client data portal.',
        source_snippet:
          'Our fleet of temperature-controlled vehicles is maintained to the highest standards, with trained drivers and regular vehicle qualification to ensure product integrity throughout delivery.',
        source_url: 'https://www.coldexlogistics.com.sg/fleet',
      },
    ],
    gaps: [
      {
        id: 'g-011-1',
        title: 'No real-time monitoring despite HSA pharmaceutical licence',
        detail:
          "Coldex holds an HSA pharmaceutical licence — a signal that their clients are regulated pharma companies with strict GDP requirements. Yet there's no evidence of real-time temperature monitoring or client-accessible data logs, creating compliance risk.",
        severity: 'high',
        gnd_service: 'Cold Chain Management',
        based_on_fact_id: 'f-011-2',
      },
      {
        id: 'g-011-2',
        title: 'Vehicle qualification is manual and periodic',
        detail:
          'Coldex references "regular vehicle qualification" — implying periodic manual checks rather than continuous monitoring. This approach is increasingly insufficient under HSA GDP guidelines for pharmaceutical transport.',
        severity: 'medium',
        gnd_service: 'Asset Tracking & Monitoring',
        based_on_fact_id: 'f-011-2',
      },
    ],
    pitch: {
      angle:
        "Coldex's HSA licence signals serious pharmaceutical clients — and those clients will increasingly require continuous temperature data and audit trails that Coldex cannot yet provide. GND's ThinxFresh and asset tracking layer can close this gap, protecting Coldex's pharmaceutical contracts as HSA guidelines tighten.",
      opener:
        "Hi [Name], Coldex's HSA licence means your clients are regulated pharma companies — GND's ThinxFresh can give you continuous temperature records and automated compliance exports before those clients start asking for them.",
    },
  },
  {
    id: 'co-012',
    company_name: 'Pelican BioThermal',
    founded: '1976',
    hq: 'Plymouth, Minnesota, USA',
    industry: 'Temperature-controlled packaging and cold-chain rental',
    size: 'Mid-size (Peli Products subsidiary, ~800 employees)',
    website: 'https://www.pelicanbiothermal.com',
    linkedin_url: 'https://www.linkedin.com/company/pelican-biothermal',
    phone: '+1-763-694-4400',
    researched_at: '2026-08-05T14:10:00Z',
    facts: [
      {
        id: 'f-012-1',
        claim:
          'Pelican BioThermal manufactures and rents temperature-controlled packaging solutions (Credo™ and Chronos™ product lines) for pharmaceutical and clinical trial logistics.',
        source_snippet:
          'Pelican BioThermal designs and manufactures Credo™ passive temperature-controlled packaging and Chronos™ active PCM systems for pharmaceutical, biotech, and clinical trial cold-chain shipments globally.',
        source_url: 'https://www.pelicanbiothermal.com/products',
      },
      {
        id: 'f-012-2',
        claim:
          'Pelican BioThermal offers a container tracking service but does not provide continuous in-transit temperature monitoring integrated with their packaging rental fleet.',
        source_snippet:
          'Pelican BioThermal\'s NCA (Network Controlled Ambient) rental service includes container tracking to monitor fleet location and utilisation. Containers are requalified after each use to maintain performance specifications.',
        source_url: 'https://www.pelicanbiothermal.com/nca-rental',
      },
    ],
    gaps: [
      {
        id: 'g-012-1',
        title: 'Container tracking tracks location — not in-transit temperature',
        detail:
          "Pelican's NCA tracking covers container location and fleet utilisation, but in-transit temperature inside the container during shipment is not continuously monitored. For clinical trial logistics, every temperature excursion must be documented.",
        severity: 'high',
        gnd_service: 'Cold Chain Management',
        based_on_fact_id: 'f-012-2',
      },
      {
        id: 'g-012-2',
        title: 'Rental fleet requalification is post-use — not predictive',
        detail:
          'Containers are requalified after each use rather than monitored continuously for performance degradation. Predictive maintenance via sensor data could reduce requalification failures and extend container useful life.',
        severity: 'medium',
        gnd_service: 'Product Engineering',
        based_on_fact_id: 'f-012-2',
      },
    ],
    pitch: {
      angle:
        "Pelican BioThermal's container rental network is global, but the containers themselves lack continuous in-transit temperature sensors. GND's IoT hardware integration can embed sensor nodes into Credo™ and Chronos™ containers, turning Pelican's rental fleet into a fully monitored cold-chain asset with live data for clinical trial sponsors.",
      opener:
        "Hi [Name], Pelican's rental containers are best-in-class passive packaging — GND can embed IoT temperature sensors into the Credo™ and Chronos™ units so clinical trial sponsors get continuous data, not just post-delivery logs.",
    },
  },
];

export const GND_SERVICES: GNDService[] = [
  'Cold Chain Management',
  'Warehouse Management',
  'Asset Tracking & Monitoring',
  'Product Engineering',
  'Platform',
];

export function getCompanyById(id: string): Company | undefined {
  return MOCK_COMPANIES.find((c) => c.id === id);
}

export function getSeverityCounts(company: Company): { high: number; medium: number; low: number } {
  return {
    high: company.gaps.filter((g) => g.severity === 'high').length,
    medium: company.gaps.filter((g) => g.severity === 'medium').length,
    low: company.gaps.filter((g) => g.severity === 'low').length,
  };
}

export function getServiceLines(company: Company): GNDService[] {
  return [...new Set(company.gaps.map((g) => g.gnd_service))];
}

export function formatResearchDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Date + time -- used where knowing exactly when a (re-)research last
// completed matters, not just the day. Compact list/card views stay on
// the date-only formatter above so they don't get cluttered.
export function formatResearchDateTime(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${formatResearchDate(iso)}, ${hours}:${minutes}`;
}