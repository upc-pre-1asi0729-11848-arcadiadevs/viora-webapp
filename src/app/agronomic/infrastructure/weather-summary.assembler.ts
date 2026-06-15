/**
 * @file weather-summary.assembler.ts
 * @description specialized assembler for mapping Weather Summary resources to domain entities.
 */
import {
  ClimateRiskLevel,
  WeatherForecastDay,
  WeatherSummary
} from '../domain/model/weather-summary.entity';

import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import {
  WeatherForecastDayResource,
  WeatherSummaryResource
} from './weather-summaries-response';

export class WeatherSummaryAssembler extends BaseAssembler {
  /**
   * Transforms a single resource into an entity.
   * @param {Object} resource - Raw data point.
   * @returns {any}
   */
  static toEntityFromResource(
    resource: WeatherSummaryResource | null | undefined
  ): WeatherSummary {
    return new WeatherSummary({
      id: resource?.id ?? null,
      city: resource?.city ?? '',
      currentTemp: resource?.currentTemp ?? 0,
      condition: resource?.condition ?? '',
      lastUpdate: resource?.lastUpdate ?? '',
      icon: resource?.icon ?? '',
      backgroundImage: resource?.backgroundImage ?? '',
      forecast3Days: this.toForecastDays(resource?.forecast3Days ?? []),
      temperatureAnomaly: resource?.temperatureAnomaly ?? 0,
      climateRisk: this.toClimateRiskLevel(resource?.climateRisk)
    });
  }

  /**
   * Transforms a collection of resources into entities.
   * @param {Object[]} resources - Array of raw data points.
   * @returns {any[]}
   */
  static toEntitiesFromResources(
    resources: WeatherSummaryResource[] = []
  ): WeatherSummary[] {
    return this.toEntities(resources, resource => this.toEntityFromResource(resource));
  }

  private static toForecastDays(
    resources: WeatherForecastDayResource[] = []
  ): WeatherForecastDay[] {
    return resources.map(resource => ({
      dayLabel: resource.dayLabel ?? '',
      date: '',
      minTemp: resource.minTemp ?? 0,
      maxTemp: resource.maxTemp ?? 0,
      condition: resource.condition ?? '',
      status: ''
    }));
  }

  private static toClimateRiskLevel(value: string | undefined): ClimateRiskLevel {
    const validRiskLevels: ClimateRiskLevel[] = ['Low', 'Medium', 'High'];

    return validRiskLevels.includes(value as ClimateRiskLevel)
      ? value as ClimateRiskLevel
      : 'Low';
  }
}
