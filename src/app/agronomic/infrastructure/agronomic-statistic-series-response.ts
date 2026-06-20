/**
 * @file agronomic-statistic-series-response.ts
 * @description API resource payload for GET /agronomic-statistics?view=series.
 */

export interface MetricTrendResource {
  currentValue?: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  direction?: string;
}

export interface AgronomicStatisticSeriesResource {
  plotId?: number | string | null;
  timeRange?: string;
  labels?: string[];
  ndviSeries?: number[];
  cpSeries?: number[];
  chillHoursSeries?: number[];
  threshold?: number;
  chillRequirementSource?: string;
  chillMetricModel?: string;
  chillUnit?: string;
  trend?: string;
  statusLabel?: string;
  observation?: string;
  ndviTrend?: MetricTrendResource | null;
  chillPortionsTrend?: MetricTrendResource | null;
  chillHoursTrend?: MetricTrendResource | null;
}
