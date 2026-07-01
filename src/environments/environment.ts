export const environment = {
  production: false,

  // Real Viora Platform backend (Spring Boot, hosted on Render).
  vioraPlatformApiUrl: 'https://os-viora-platform.onrender.com/api/v1',

  // The real backend requires a userId on every request. Until authentication
  // is wired, this configurable id acts as the active producer.
  defaultUserId: 1,

  endpoints: {
    // Real backend (agronomic bounded context). Aggregate roots are addressed
    // by their collection/resource URL; projections are requested via the
    // ?view= query param and collection filters via query params (sort/status).
    plots: '/plots',
    monitoringSummaries: '/monitoring-summaries',
    agronomicStatistics: '/agronomic-statistics',
    dynamicNutritionPlans: '/dynamic-nutrition-plans',

    // Surveillance bounded context (real backend)
    alerts: '/alerts',
    communityRisk: '/community-risk',
    pestSightingReports: '/pest-sighting-reports',
    symptomDictionaryItems: '/symptom-dictionary-items',

    // IoT devices (real backend): flat aggregate read for the dashboard; writes
    // are nested under the owning plot (/plots/{plotId}/iot-devices).
    iotDevices: '/iot-devices',

    // Intervention bounded context (Expert Assistance). Requests are a real
    // aggregate (create/list by grower+plot). Specialist candidates now come from
    // a real seeded catalog + matching policy; service proposals and specialist
    // profiles/contact are real (contact is gated to accepted requests).
    interventionRequests: '/intervention-requests',
    specialistCandidates: '/specialist-candidates',
    serviceProposals: '/service-proposals',
    specialists: '/specialists',

    // Billing bounded context (Subscription, Billing & Referral): operational
    // expenses the producer registers against their plots.
    expenses: '/expenses',
  },

  mapbox: {

    accessToken:
      'YOUR_MAPBOX_TOKEN:HERE',
  },
};
