/**
 * @file monitoring-summaries-response.ts
 * @description API resource payload for GET /monitoring-summaries/current
 * (All Plots aggregate from the real backend).
 */

export interface WeatherSnapshotResource {
  weatherStatus?: string;
  measurementDate?: string;
  climateRiskLevel?: string;
  temperature?: number;
}

export interface MitigationRecommendationResource {
  actionType?: string;
  nutritionInputRecommendation?: string;
  applicationWindowStart?: string;
  applicationWindowEnd?: string;
}

export interface MonitoringSummaryResource {
  monitoringSummaryId?: number | string | null;
  userId?: number | string | null;
  generalHealthStatus?: string;
  ndviValue?: number;
  accumulatedChillHours?: number;
  yieldForecast?: number;
  measurementDate?: string;
  weatherSnapshot?: WeatherSnapshotResource | null;
  climateRiskLevel?: string;
  mitigationRecommendations?: MitigationRecommendationResource[];
}
