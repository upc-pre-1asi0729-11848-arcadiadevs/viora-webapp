/**
 * @file monitoring-summary.assembler.ts
 * @description Maps the real flat GET /monitoring-summaries/current resource
 * into the nested MonitoringSummary domain entity consumed by the dashboard.
 */
import { MonitoringSummary } from '../domain/model/monitoring-summary.entity';
import { AgronomicRecord } from '../domain/model/agronomic-record.entity';
import { ChillHourRecord } from '../domain/model/chill-hour-record.entity';
import { YieldForecast } from '../domain/model/yield-forecast.entity';
import { OverallPlotHealth } from '../domain/model/overall-plot-health.entity';
import { WeatherSummary } from '../domain/model/weather-summary.entity';

import { MonitoringSummaryResource, WeatherSnapshotResource } from './monitoring-summaries-response';
import {
  normalizeClimateRisk,
  normalizeOverallHealthStatus,
  normalizePlotHealthStatus,
  normalizeWeatherCondition,
  normalizeYieldRisk,
} from './status-normalizers';

export class MonitoringSummaryAssembler {
  /**
   * Transforms the single current-summary resource into the domain entity.
   */
  static toEntityFromResource(
    resource: MonitoringSummaryResource | null | undefined,
  ): MonitoringSummary {
    const measurementDate = resource?.measurementDate ?? '';
    const climateRiskLevel =
      resource?.climateRiskLevel ?? resource?.weatherSnapshot?.climateRiskLevel;

    return new MonitoringSummary({
      id: resource?.monitoringSummaryId ?? null,
      period: 'current',
      generalHealthStatus: normalizePlotHealthStatus(resource?.generalHealthStatus),
      latestNdvi: new AgronomicRecord({
        date: measurementDate,
        ndviIndex: resource?.ndviValue ?? 0,
        ndviTrend: 'stable',
        ndviStatusLabel: normalizePlotHealthStatus(resource?.generalHealthStatus),
      }),
      chillHourRecord: new ChillHourRecord({
        accumulatedChillPortions: resource?.accumulatedChillHours ?? 0,
        unit: 'h',
        weeklyDiff: 0,
        generatedAt: measurementDate,
      }),
      yieldForecast: new YieldForecast({
        tonnes: resource?.yieldForecast ?? 0,
        riskLevel: normalizeYieldRisk(climateRiskLevel),
      }),
      overallPlotHealth: new OverallPlotHealth({
        status: normalizeOverallHealthStatus(resource?.generalHealthStatus),
      }),
      weather: this.toWeatherSummary(resource?.weatherSnapshot, measurementDate),
      updatedAt: measurementDate,
    });
  }

  /**
   * Builds a current-only weather summary from the snapshot embedded in the
   * monitoring summary (no 3-day forecast or anomaly at the All Plots scope).
   */
  private static toWeatherSummary(
    snapshot: WeatherSnapshotResource | null | undefined,
    fallbackDate: string,
  ): WeatherSummary | null {
    if (!snapshot) {
      return null;
    }

    return new WeatherSummary({
      currentTemp: snapshot.temperature ?? 0,
      condition: normalizeWeatherCondition(snapshot.weatherStatus),
      climateRisk: normalizeClimateRisk(snapshot.climateRiskLevel),
      lastUpdate: snapshot.measurementDate ?? fallbackDate,
    });
  }
}
