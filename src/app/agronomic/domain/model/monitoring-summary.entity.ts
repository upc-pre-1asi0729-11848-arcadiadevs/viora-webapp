/**
 * @file monitoring-summary.entity.ts
 * @description Domain entity representing an aggregated summary of agronomic monitoring data.
 */
import { AgronomicRecord } from './agronomic-record.entity';
import { ChillHourRecord } from './chill-hour-record.entity';
import { YieldForecast } from './yield-forecast.entity';
import { OverallPlotHealth } from './overall-plot-health.entity';
import { WeatherSummary } from './weather-summary.entity';

export type MonitoringSummaryId = number | string | null;

export interface MonitoringSummaryProperties {
  id?: MonitoringSummaryId;
  period?: string;
  generalHealthStatus?: string;
  latestNdvi?: AgronomicRecord;
  chillHourRecord?: ChillHourRecord;
  yieldForecast?: YieldForecast;
  overallPlotHealth?: OverallPlotHealth;
  weather?: WeatherSummary | null;
  updatedAt?: string;
}

export class MonitoringSummary {
  readonly id: MonitoringSummaryId;
  readonly period: string;
  readonly generalHealthStatus: string;
  readonly latestNdvi: AgronomicRecord;
  readonly chillHourRecord: ChillHourRecord;
  readonly yieldForecast: YieldForecast;
  readonly overallPlotHealth: OverallPlotHealth;
  readonly weather: WeatherSummary | null;
  readonly updatedAt: string;

  /**
   * @param {MonitoringSummaryProperties} params - Entity data.
   * @param {MonitoringSummaryId} [params.id] - Unique identifier.
   * @param {string} [params.period] - Time period for the summary.
   * @param {AgronomicRecord} [params.latestNdvi] - Latest NDVI record.
   * @param {ChillHourRecord} [params.chillHourRecord] - Chill hours summary.
   * @param {YieldForecast} [params.yieldForecast] - Current yield forecast.
   * @param {OverallPlotHealth} [params.overallPlotHealth] - Aggregated plot health.
   * @param {string} [params.updatedAt] - Last update timestamp.
   */
  constructor({
                id = null,
                period = 'current',
                generalHealthStatus = '',
                latestNdvi = new AgronomicRecord(),
                chillHourRecord = new ChillHourRecord(),
                yieldForecast = new YieldForecast(),
                overallPlotHealth = new OverallPlotHealth(),
                weather = null,
                updatedAt = ''
              }: MonitoringSummaryProperties = {}) {
    this.id = id;
    this.period = period;
    this.generalHealthStatus = generalHealthStatus;
    this.latestNdvi = latestNdvi;
    this.chillHourRecord = chillHourRecord;
    this.yieldForecast = yieldForecast;
    this.overallPlotHealth = overallPlotHealth;
    this.weather = weather;
    this.updatedAt = updatedAt;
  }

  get hasUpdatedAt(): boolean {
    return Boolean(this.updatedAt);
  }

  get updatedAtDate(): Date | null {
    if (!this.updatedAt) {
      return null;
    }

    const parsedDate = new Date(this.updatedAt);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  get isCurrentPeriod(): boolean {
    return this.period === 'current';
  }
}
