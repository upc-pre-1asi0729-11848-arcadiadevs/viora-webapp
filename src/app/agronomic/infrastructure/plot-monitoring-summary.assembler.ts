/**
 * @file plot-monitoring-summary.assembler.ts
 * @description Maps GET /plots/{plotId}/monitoring-summary into the shared
 * MonitoringSummary entity, so the dashboard KPI cards render the selected
 * plot's current figures with the same consumers as the All Plots scope.
 */
import { MonitoringSummary } from '../domain/model/monitoring-summary.entity';
import { AgronomicRecord } from '../domain/model/agronomic-record.entity';
import { ChillHourRecord } from '../domain/model/chill-hour-record.entity';
import { YieldForecast } from '../domain/model/yield-forecast.entity';
import { OverallPlotHealth } from '../domain/model/overall-plot-health.entity';
import { WeatherSummary } from '../domain/model/weather-summary.entity';

import { PlotMonitoringSummaryResource } from './plot-monitoring-summary-response';
import { WeatherSnapshotResource } from './monitoring-summaries-response';
import {
  normalizeClimateRisk,
  normalizeNdviTrend,
  normalizeOverallHealthStatus,
  normalizePlotHealthStatus,
  normalizeWeatherCondition,
  normalizeYieldRisk,
} from './status-normalizers';

export class PlotMonitoringSummaryAssembler {
  static toEntityFromResource(
    resource: PlotMonitoringSummaryResource | null | undefined,
  ): MonitoringSummary {
    const lastUpdatedAt = resource?.lastUpdatedAt ?? '';
    const healthStatusLabel = normalizePlotHealthStatus(resource?.healthStatus);

    return new MonitoringSummary({
      id: resource?.plotId ?? null,
      period: 'current',
      generalHealthStatus: healthStatusLabel,
      latestNdvi: new AgronomicRecord({
        plotId: resource?.plotId ?? null,
        date: lastUpdatedAt,
        ndviIndex: resource?.currentNdvi ?? 0,
        ndviTrend: normalizeNdviTrend(resource?.ndviTrend?.direction),
        ndviChangeRate: resource?.ndviTrend?.changeRate ?? 0,
        ndviStatusLabel: healthStatusLabel,
      }),
      chillHourRecord: new ChillHourRecord({
        plotId: resource?.plotId ?? null,
        accumulatedChillPortions: resource?.chillPortions ?? 0,
        unit: 'CP',
        threshold: resource?.chillRequirementPortions ?? 600,
        weeklyDiff: resource?.chillPortionsWeeklyDelta ?? 0,
        generatedAt: lastUpdatedAt,
      }),
      yieldForecast: new YieldForecast({
        plotId: resource?.plotId ?? null,
        tonnes: resource?.yieldForecastTonnes ?? 0,
        riskLevel: normalizeYieldRisk(resource?.climateRiskLevel),
      }),
      overallPlotHealth: new OverallPlotHealth({
        status: normalizeOverallHealthStatus(resource?.healthStatus),
      }),
      weather: this.toWeatherSummary(resource?.weather, resource?.plotName ?? '', lastUpdatedAt),
      updatedAt: lastUpdatedAt,
    });
  }

  private static toWeatherSummary(
    snapshot: WeatherSnapshotResource | null | undefined,
    plotName: string,
    fallbackDate: string,
  ): WeatherSummary | null {
    if (!snapshot) {
      return null;
    }

    return new WeatherSummary({
      city: plotName,
      currentTemp: snapshot.temperature ?? 0,
      condition: normalizeWeatherCondition(snapshot.weatherStatus),
      climateRisk: normalizeClimateRisk(snapshot.climateRiskLevel),
      lastUpdate: snapshot.measurementDate ?? fallbackDate,
    });
  }
}
