export const environment = {
  production: false,

  // Real Viora Platform backend (Spring Boot, hosted on Render).
  vioraPlatformApiUrl: 'https://os-viora-platform.onrender.com/api/v1',

  // Mock API kept for bounded contexts not yet covered by the real backend
  // (surveillance alerts, IoT sensor telemetry for the Water Stress cards).
  mockApiUrl: 'https://69ff99d02b7ab349602fc9e2.mockapi.io/api/v1',

  // The real backend requires a userId on every request. Until authentication
  // is wired, this configurable id acts as the active producer.
  defaultUserId: 1,

  endpoints: {
    // Real backend (agronomic bounded context)
    plots: '/plots',
    plotsOverview: '/plots/overview',
    monitoringSummaryCurrent: '/monitoring-summaries/current',
    agronomicStatistics: '/agronomic-statistics',
    agronomicStatisticsSeries: '/agronomic-statistics/series',
    dynamicNutritionPlans: '/dynamic-nutrition-plans',

    // Mock API (other bounded contexts / not yet on the real backend)
    alerts: '/alerts',
    iotDevices: '/iot-devices',
  },

  mapbox: {
    accessToken:
      'YOUR_MAPBOX_TOKEN:HERE',
  },
};
