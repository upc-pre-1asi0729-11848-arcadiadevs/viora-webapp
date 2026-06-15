/**
 * @file plot-monitoring-summary-response.ts
 * @description API resource payload for GET /plots/{plotId}/monitoring-summary.
 */
import { WeatherSnapshotResource, MitigationRecommendationResource } from './monitoring-summaries-response';

export interface NdviTrendResource {
  direction?: string;
  changeRate?: number;
  series?: number[];
}

export interface DataSourceResource {
  provider?: string;
  availability?: string;
  lastReadingAt?: string;
  updateFrequencyMinutes?: number;
}

export interface PlotMonitoringSummaryResource {
  plotId?: number | string | null;
  userId?: number | string | null;
  plotName?: string;
  currentNdvi?: number;
  ndviTrend?: NdviTrendResource | null;
  chillPortions?: number;
  chillPortionsWeeklyDelta?: number | null;
  chillRequirementPortions?: number;
  chillRequirementSource?: string;
  chillMetricModel?: string;
  chillUnit?: string;
  healthStatus?: string;
  yieldForecastTonnes?: number;
  weather?: WeatherSnapshotResource | null;
  climateRiskLevel?: string;
  lastUpdatedAt?: string;
  recommendations?: MitigationRecommendationResource[];
  climateSource?: DataSourceResource | null;
  ndviSource?: DataSourceResource | null;
}
