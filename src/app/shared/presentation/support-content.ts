/**
 * @file support-content.ts
 * @description Presentation content for the Support screen: FAQ articles and the
 * legal documents. These are app-level editorial/legal content (not per-user
 * data), so they live as typed constants in the presentation layer.
 */

export interface FaqArticle {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDocument {
  id: string;
  title: string;
  icon: string;
  summary: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}

/** FAQ categories in display order (counts are derived from the articles). */
export const FAQ_CATEGORIES: string[] = [
  'Account & Billing',
  'Plots & IoT devices',
  'Alerts & Nutrition',
  'Expert Assistance',
  'Data & Reports',
];

export const FAQ_ARTICLES: FaqArticle[] = [
  {
    id: 'invite-teammate',
    category: 'Account & Billing',
    question: 'How do I invite a teammate to my organization?',
    answer:
      'Open Settings › Profile and share your workspace, or send your referral link from Settings › Referrals. Teammates you invite join under the same account so they can view the plots and alerts you grant them. Full multi-seat role management is rolling out alongside specialist and producer accounts.',
  },
  {
    id: 'billing-cycle',
    category: 'Account & Billing',
    question: 'Can I change my billing cycle from monthly to annual?',
    answer:
      'Yes. Go to Subscription, open Available plans and choose the annual tier, then Switch plan. You are redirected to MercadoPago to confirm the payment; the new cycle applies from the next billing period and any change is prorated on your following invoice.',
  },
  {
    id: 'update-card',
    category: 'Account & Billing',
    question: 'How do I update the card on file?',
    answer:
      'Your card is stored securely by MercadoPago — Viora never keeps your full card number. The payment method shown in Subscription updates automatically to the card you use the next time you complete a payment through MercadoPago checkout.',
  },
  {
    id: 'device-offline',
    category: 'Plots & IoT devices',
    question: 'Why is my plot showing "IoT device offline"?',
    answer:
      'A device is marked offline when it has not reported a reading within its expected interval. Check the gateway power and connectivity, confirm the sensor is within range, and verify the device is still linked to the plot in IoT Devices. Readings resume automatically once the device reconnects.',
  },
  {
    id: 'iot-per-plot',
    category: 'Plots & IoT devices',
    question: 'How many IoT devices can I connect per plot?',
    answer:
      'The limit depends on your plan. Grower Plus supports up to 10 devices and Grower Pro up to 100 across your account. Your current usage is shown on the Subscription screen under "IoT devices connected".',
  },
  {
    id: 'register-plot',
    category: 'Plots & IoT devices',
    question: 'How do I register a new plot?',
    answer:
      'Go to My Plots › add a plot, draw or upload the field boundary on the map, and confirm. Viora computes the area automatically and begins pulling satellite NDVI and weather data for that boundary. You can then link IoT devices to the plot.',
  },
  {
    id: 'critical-alert',
    category: 'Alerts & Nutrition',
    question: 'What triggers a "Critical" alert?',
    answer:
      'Critical alerts combine severity signals: a sharp NDVI drop, sensor thresholds breached, and — for pests — a confirmed symptom report or a quarantine-relevant threat such as suspected Xylella. Critical alerts are surfaced first and are the ones best suited to escalate through Expert Assistance.',
  },
  {
    id: 'dynamic-nutrition',
    category: 'Alerts & Nutrition',
    question: 'How does Dynamic Nutrition calculate recommendations?',
    answer:
      'It combines your plot\'s phenological stage, recent NDVI and vigor trends, soil and climate signals, and crop requirements to suggest nutrition adjustments across the season. Recommendations are advisory — the final agronomic decision always remains with the grower or their specialist.',
  },
  {
    id: 'assistance-response',
    category: 'Expert Assistance',
    question: 'How quickly do specialists respond to Expert Assistance requests?',
    answer:
      'Response targets depend on your plan and are defined in the Service Level Agreement. Requests linked to Critical alerts are prioritized. You can track each request\'s status — pending, proposal received, or accepted — from the Expert Assistance screen.',
  },
  {
    id: 'same-specialist',
    category: 'Expert Assistance',
    question: 'Can I request the same specialist across multiple interventions?',
    answer:
      'Yes, when that specialist is available for the plot and alert in question. Specialists are ranked per request by availability, success rate and distance, but you can send a new request to a specialist you have worked with before from their profile card.',
  },
  {
    id: 'export-history',
    category: 'Data & Reports',
    question: 'Can I export my expense and intervention history?',
    answer:
      'Expense history and intervention records are available in their respective screens and can be reviewed per plot and per billing cycle. Structured export (CSV/PDF) of expenses, invoices and intervention outcomes is on the roadmap for reporting and accounting workflows.',
  },
  {
    id: 'data-retention',
    category: 'Data & Reports',
    question: 'How long is historical plot data retained?',
    answer:
      'Active accounts retain plot, sensor and agronomic history for the life of the account so you can review season-over-season trends. After account deactivation, data is retained for a limited period and then deleted or anonymized as described in the Privacy Policy.',
  },
];

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: 'terms',
    title: 'Terms & Conditions',
    icon: 'description',
    summary:
      'The agreement governing your use of the Viora platform, subscription terms, and acceptable use of field data.',
    lastUpdated: 'May 12, 2026',
    intro:
      'These Terms & Conditions ("Terms") govern access to and use of the Viora platform, mobile and web applications, and related services ("Service"). By creating an account or using the Service you agree to these Terms and to the Privacy Policy.',
    sections: [
      {
        heading: 'Acceptance of terms',
        body: 'By creating a Viora account or using the Service you confirm that you are authorized to bind the farm, business or organization on whose behalf you act, and that you accept these Terms and the Privacy Policy. If you do not agree, do not use the Service.',
      },
      {
        heading: 'Description of the Service',
        body: 'Viora provides agricultural plot monitoring, IoT device management, satellite NDVI and weather insights, dynamic nutrition recommendations, pest surveillance, and access to independent agronomy specialists ("Experts"). Features vary by subscription plan and may evolve over time.',
      },
      {
        heading: 'Advisory nature of recommendations',
        body: 'All indicators, alerts and recommendations — including dynamic nutrition, pest triage and yield estimates — are advisory and provided for informational purposes. Final agronomic, phytosanitary and commercial decisions remain the sole responsibility of the grower and, where engaged, their chosen specialist.',
      },
      {
        heading: 'Accounts and eligibility',
        body: 'You are responsible for the accuracy of your account information, for safeguarding your credentials, and for all activity under your account. You must promptly notify Viora of any unauthorized use. Accounts are for the registered grower or organization and may not be shared beyond authorized users.',
      },
      {
        heading: 'Subscriptions, billing and renewals',
        body: 'Paid plans renew automatically each billing cycle at the then-current price through our payment processor (MercadoPago). Cancelling stops future renewals; access continues until the end of the paid period. Referral or promotional coupons are subject to their own conditions and cannot be combined unless stated.',
      },
      {
        heading: 'Acceptable use',
        body: 'You agree not to misuse the Service, including attempting to breach security, reverse engineer the platform, resell access without authorization, upload unlawful content, or interfere with other users. Viora may throttle, suspend or terminate accounts that violate these Terms or applicable law.',
      },
      {
        heading: 'Data ownership and license',
        body: 'You retain ownership of the plot boundaries, sensor readings, expense records and other data you upload ("Grower Data"). You grant Viora a license to process Grower Data to operate and improve the Service, and permission to use anonymized, aggregated data to improve regional pest, climate and agronomic models.',
      },
      {
        heading: 'Third-party services',
        body: 'The Service integrates third-party providers — including satellite imagery (AgroMonitoring), maps (Mapbox), payments (MercadoPago), and transactional email — each governed by its own terms. Independent Experts are not employees of Viora; the platform facilitates the connection but the professional engagement is between grower and specialist.',
      },
      {
        heading: 'Disclaimers and limitation of liability',
        body: 'The Service is provided "as is" without warranties of any kind, and Viora does not guarantee crop outcomes, yield, or the prevention of pests or disease. To the maximum extent permitted by law, Viora\'s aggregate liability is limited to the fees paid for the Service in the twelve months preceding the claim.',
      },
      {
        heading: 'Termination',
        body: 'Viora may suspend or terminate accounts for non-payment, misuse or legal reasons. You may deactivate your account at any time from Settings › Security; deactivation revokes access and pauses monitoring on all linked plots at the end of the billing period.',
      },
      {
        heading: 'Changes and governing law',
        body: 'We may update these Terms and will post the effective date; continued use after changes constitutes acceptance. These Terms are governed by the laws of the Republic of Peru, without regard to conflict-of-law rules, and disputes are subject to the competent courts of Lima, Peru.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    icon: 'shield',
    summary:
      'What plot, device, and account data we collect, how it is used, and your rights to access or delete it.',
    lastUpdated: 'May 12, 2026',
    intro:
      'This Privacy Policy explains what data Viora collects, why we process it, who we share it with, and the rights you have over your information. It applies to all users of the Viora platform.',
    sections: [
      {
        heading: 'Data we collect',
        body: 'We collect: (a) account data (name, email, phone, role, organization); (b) plot and geospatial data (field boundaries, area, location); (c) IoT and agronomic data (sensor readings, NDVI, weather, phenology); (d) usage data (feature interactions, device and log data); and (e) payment metadata from MercadoPago (card brand, last four digits, expiry) — never your full card number.',
      },
      {
        heading: 'How we use data',
        body: 'We use data to provide and secure the Service, generate indicators and recommendations, match you with specialists, process subscriptions and referrals, send transactional notifications, provide support, and — in anonymized, aggregated form — to improve regional agronomic, pest and climate models.',
      },
      {
        heading: 'Legal bases',
        body: 'We process personal data to perform our contract with you, to comply with legal obligations, for our legitimate interests in operating and improving the Service, and — where required — on the basis of your consent, which you may withdraw at any time.',
      },
      {
        heading: 'Sharing and processors',
        body: 'We do not sell your personal data. We share it with service providers who process it on our behalf under contract, including AgroMonitoring (satellite/weather), Mapbox (maps), MercadoPago (payments), our transactional email provider, and cloud media storage for profile images. Independent specialists you engage receive only the request context you choose to share.',
      },
      {
        heading: 'Data retention',
        body: 'We retain Grower Data for the life of an active account so you can review historical trends. After deactivation, data is retained for a limited grace period to allow reactivation and to meet legal or accounting obligations, and is then deleted or irreversibly anonymized.',
      },
      {
        heading: 'Your rights',
        body: 'Subject to applicable law you may access, correct, export, restrict or delete your personal data, and object to certain processing. You can manage core profile data in Settings › Profile and deactivate your account in Settings › Security, or contact us to exercise other rights.',
      },
      {
        heading: 'Security',
        body: 'We apply technical and organizational safeguards including encryption in transit, access controls, hashed credentials, and gated access to sensitive integrations. No system is perfectly secure, but we work to protect your data and will notify affected users of material breaches as required by law.',
      },
      {
        heading: 'International transfers and children',
        body: 'Some processors may store or process data outside your country under appropriate safeguards. The Service is intended for agricultural businesses and is not directed to children; we do not knowingly collect data from minors.',
      },
      {
        heading: 'Changes and contact',
        body: 'We will post the effective date of any update to this Policy. For privacy requests or questions, contact Viora through the account owner\'s registered email or the support channels listed in your account.',
      },
    ],
  },
  {
    id: 'sla',
    title: 'Service Level Agreement',
    icon: 'schedule',
    summary:
      'Uptime commitments for monitoring and alerting, and response-time targets for Expert Assistance by plan.',
    lastUpdated: 'Mar 03, 2026',
    intro:
      'This Service Level Agreement ("SLA") describes the availability, alerting and response commitments Viora targets for paid plans. It supplements the Terms & Conditions.',
    sections: [
      {
        heading: 'Scope',
        body: 'This SLA applies to the monitoring, alerting and Expert Assistance features of the Viora platform for accounts on an active paid subscription and in good standing. Free trials, beta features and third-party outages are excluded as described below.',
      },
      {
        heading: 'Platform availability',
        body: 'Viora targets 99.5% monthly availability of the web platform and alerting pipeline on Grower Plus, and 99.9% on Grower Pro. Availability is measured as the percentage of minutes in the calendar month the core services are reachable, excluding scheduled maintenance and excluded events.',
      },
      {
        heading: 'Alert delivery targets',
        body: 'Once the underlying data is received and processed, in-app alerts are targeted to appear within 15 minutes for standard alerts and within 5 minutes for Critical alerts. Timeliness of satellite- and weather-derived signals also depends on third-party data cadence (see Data freshness).',
      },
      {
        heading: 'Expert Assistance response targets',
        body: 'Expert Assistance connects growers with independent specialists. Target first-response windows are best-effort and prioritized for Critical alerts. Grower Pro requests receive priority routing. Because specialists are independent professionals, actual response times may vary with availability.',
      },
      {
        heading: 'Data freshness',
        body: 'Satellite NDVI and imagery refresh on the satellite revisit and cloud-cover cadence and are not real-time. Weather forecasts and current conditions refresh periodically from the provider. IoT sensor readings appear as devices report them; a device that stops reporting is flagged offline.',
      },
      {
        heading: 'Scheduled maintenance',
        body: 'Planned maintenance is performed during low-usage windows where practical, and material windows are communicated in advance. Scheduled maintenance does not count against availability commitments.',
      },
      {
        heading: 'Exclusions',
        body: 'Commitments do not apply to issues caused by factors outside Viora\'s reasonable control, including third-party provider outages (satellite, maps, payments, connectivity), force majeure, misuse, or problems arising from grower hardware, installation or connectivity.',
      },
      {
        heading: 'Service credits and review',
        body: 'Where an availability target is materially missed in a calendar month, eligible accounts may request a proportional service credit toward a future invoice as the sole remedy. Targets are reviewed periodically and may be updated with notice.',
      },
    ],
  },
  {
    id: 'warranty',
    title: 'Device & Hardware Warranty',
    icon: 'memory',
    summary:
      'Coverage terms for Viora-certified IoT sensors, gateways, and replacement policy.',
    lastUpdated: 'Jan 20, 2026',
    intro:
      'This Limited Warranty covers IoT hardware provided or certified by Viora — including field sensors and gateways — used with the Viora platform under normal agricultural conditions.',
    sections: [
      {
        heading: 'Coverage scope',
        body: 'This warranty covers Viora-certified IoT sensors and gateways against defects in materials and workmanship under normal use, installed and operated per the included guidelines. It applies to the original grower account that acquired the device.',
      },
      {
        heading: 'Warranty period',
        body: 'The standard warranty period is 12 months from the date of delivery or activation, whichever is later, unless a different period is stated for a specific device. Replacement units are covered for the remainder of the original period or 90 days, whichever is longer.',
      },
      {
        heading: 'What is covered',
        body: 'Covered issues include hardware failures under normal operating conditions, manufacturing defects, and devices that fail to power on or report readings despite correct installation, adequate power and connectivity within the specified range.',
      },
      {
        heading: 'What is not covered',
        body: 'The warranty does not cover damage from improper installation, tampering or unauthorized repair, physical or water damage beyond the device\'s rated tolerances, power surges, misuse, normal battery wear, cosmetic wear, or environmental exposure exceeding published specifications.',
      },
      {
        heading: 'Installation requirements',
        body: 'Devices must be installed following the included guidelines, including siting, mounting and power requirements. Damage arising from installation that does not follow these guidelines is excluded, consistent with the device-use provisions of the Terms & Conditions.',
      },
      {
        heading: 'Replacement process',
        body: 'To make a claim, contact Viora with the device identifier and a description of the fault. Eligible devices are repaired or replaced at Viora\'s discretion. Diagnostic steps may be requested first; devices found to be functioning correctly or excluded from coverage may be returned.',
      },
      {
        heading: 'Connectivity and firmware',
        body: 'Devices may receive firmware updates to maintain compatibility and security. Connectivity depends on gateway placement, network coverage and power; connectivity issues arising from the local environment are not hardware defects and are excluded from this warranty.',
      },
      {
        heading: 'Limitations',
        body: 'This is the sole hardware warranty offered and replaces all other warranties to the extent permitted by law. Viora is not liable for crop, yield or consequential losses arising from device failure; monitoring should not be the sole basis for critical field decisions.',
      },
    ],
  },
];
