/**
 * @file status-normalizers.ts
 * @description Maps the real backend's UPPERCASE enum names (serialized via
 * `Enum.name()`) into the display values used by the agronomic domain entities.
 */
import { ClimateRiskLevel } from '../domain/model/weather-summary.entity';
import { PhenologicalRiskLevel, PlotHealthStatus } from '../domain/model/plot.entity';
import { OverallPlotHealthStatus } from '../domain/model/overall-plot-health.entity';
import { NdviTrend } from '../domain/model/agronomic-record.entity';
import { YieldRiskLevel } from '../domain/model/yield-forecast.entity';
import { MonitoringLinkStatus } from '../domain/model/plot-registration.entity';

/**
 * Normalizes a plot/general health status.
 * Backend GeneralHealthStatus: HEALTHY | WARNING | CRITICAL | UNKNOWN.
 */
export function normalizePlotHealthStatus(value: string | null | undefined): PlotHealthStatus {
  switch ((value ?? '').trim().toUpperCase()) {
    case 'HEALTHY':
      return 'Healthy';
    case 'CRITICAL':
      return 'Critical';
    case 'WARNING':
    case 'UNDER REVIEW':
    case 'UNDER_REVIEW':
    case 'UNKNOWN':
      return 'Moderate';
    default:
      return 'Healthy';
  }
}

/**
 * Normalizes the aggregated health status shown on the All Plots card.
 */
export function normalizeOverallHealthStatus(
  value: string | null | undefined,
): OverallPlotHealthStatus {
  switch ((value ?? '').trim().toUpperCase()) {
    case 'HEALTHY':
      return 'Healthy';
    case 'WARNING':
      return 'Warning';
    case 'CRITICAL':
      return 'Critical';
    case 'UNKNOWN':
    case 'UNDER REVIEW':
    case 'UNDER_REVIEW':
      return 'Moderate';
    default:
      return 'Healthy';
  }
}

/**
 * Normalizes a climate/phenological risk level.
 * Backend ClimateRiskLevel: LOW | MODERATE | HIGH | EXTREME | UNKNOWN.
 */
export function normalizeClimateRisk(value: string | null | undefined): ClimateRiskLevel {
  switch ((value ?? '').trim().toUpperCase()) {
    case 'LOW':
      return 'Low';
    case 'MODERATE':
    case 'MEDIUM':
      return 'Moderate';
    case 'HIGH':
      return 'High';
    case 'EXTREME':
      return 'Extreme';
    default:
      return 'Low';
  }
}

/**
 * Normalizes the three-level phenological risk scale.
 */
export function normalizePhenologicalRisk(
  value: string | null | undefined,
): PhenologicalRiskLevel {
  switch ((value ?? '').trim().toUpperCase()) {
    case 'MODERATE':
    case 'MEDIUM':
      return 'Moderate';
    case 'HIGH':
    case 'EXTREME':
      return 'High';
    default:
      return 'Low';
  }
}

/**
 * Normalizes the three-level yield-forecast risk scale.
 */
export function normalizeYieldRisk(value: string | null | undefined): YieldRiskLevel {
  switch ((value ?? '').trim().toUpperCase()) {
    case 'MODERATE':
    case 'MEDIUM':
      return 'Moderate';
    case 'HIGH':
    case 'EXTREME':
      return 'High';
    default:
      return 'Low';
  }
}

/**
 * Normalizes an NDVI trend direction.
 * Backend NdviTrend.Direction: RISING | FALLING | STABLE.
 * Backend TrendDirection (series metrics): UP | DOWN | STABLE.
 */
export function normalizeNdviTrend(value: string | null | undefined): NdviTrend {
  switch ((value ?? '').trim().toUpperCase()) {
    case 'RISING':
    case 'UP':
      return 'up';
    case 'FALLING':
    case 'DOWN':
      return 'down';
    default:
      return 'stable';
  }
}

/**
 * Normalizes an automatic monitoring-link state reported after registration.
 * Backend values are enum names such as ACTIVE | INITIALIZING | NOT_LINKED.
 */
export function normalizeMonitoringLink(
  value: string | null | undefined,
): MonitoringLinkStatus {
  switch ((value ?? '').trim().toUpperCase()) {
    case 'ACTIVE':
    case 'LINKED':
    case 'ENABLED':
    case 'READY':
      return 'active';
    case 'INITIALIZING':
    case 'PENDING':
    case 'PROCESSING':
    case 'IN_PROGRESS':
      return 'initializing';
    case 'NOT_LINKED':
    case 'UNLINKED':
    case 'DISABLED':
    case 'NONE':
      return 'not-linked';
    default:
      return 'unknown';
  }
}

/**
 * Converts a weather status enum name into a human-readable condition.
 * Backend WeatherStatus: SUNNY | CLOUDY | RAINY | STORMY | SNOWY | UNKNOWN.
 */
export function normalizeWeatherCondition(value: string | null | undefined): string {
  const normalized = (value ?? '').trim();

  if (!normalized) {
    return '';
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}
