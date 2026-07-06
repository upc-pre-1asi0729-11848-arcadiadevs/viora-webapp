export const environment = {
  production: false,

  // Real Viora Platform backend (Spring Boot, hosted on Render).
  vioraPlatformApiUrl: 'https://os-viora-platform.onrender.com/api/v1',

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

    // Specialist segment dashboard read model: aggregates the signed-in
    // specialist's KPIs, incoming producer requests, and performance series.
    specialistDashboard: '/specialist-dashboard',

    // Specialist Intervention Marketplace read model: the signed-in specialist's
    // inbox of incoming producer cases (PENDING), enriched across contexts.
    interventionMarketplace: '/intervention-marketplace',

    // Specialist cases read model (My Requests + Field Inspection): the signed-in
    // specialist's pipeline across statuses with their field-inspection stage.
    specialistCases: '/specialist-cases',

    // Interventions (technical-service lifecycle): composed overview + the
    // prescription/execution/outcome action endpoints.
    interventions: '/interventions',
    treatmentPrescriptions: '/treatment-prescriptions',
    interventionExecutions: '/intervention-executions',
    interventionOutcomes: '/intervention-outcomes',

    // Billing bounded context (Subscription, Billing & Referral): operational
    // expenses the producer registers against their plots.
    expenses: '/expenses',

    // Profile & Asset Management bounded context: the account holder's profile
    // (Settings › Profile), addressed by the owning userId.
    profiles: '/profiles',

    // Subscription, Billing & Referral bounded context (Settings › Referrals):
    // per-user referral code and the coupons they hold / can redeem.
    referrals: '/referrals',
    coupons: '/coupons',
    couponRedemptions: '/coupon-redemptions',

    // Subscription section (Billing): plan catalog, the user's subscription,
    // invoices (billing history), payment methods, and MercadoPago checkouts.
    plans: '/plans',
    subscriptions: '/subscriptions',
    checkouts: '/checkouts',
    invoices: '/invoices',
    paymentMethods: '/payment-methods',

    // IAM (Settings › Security): password change lives under the user resource;
    // active sessions are nested under the owning user.
    users: '/users',

    // IAM authentication: sign-in/sign-up by email, email verification and
    // verification resend.
    auth: '/auth',
  },

  // Cloudinary unsigned upload for profile photos. The cloud name and unsigned
  // preset are public (they travel in the browser on every unsigned upload), so
  // they live here in the committed env that the production build uses.
  cloudinary: {
    cloudName: 'dk4qjvqgo',
    uploadPreset: 'viora_profile_unsigned',
  },

  mapbox: {

    accessToken:
      'YOUR_MAPBOX_TOKEN:HERE',
  },
};
