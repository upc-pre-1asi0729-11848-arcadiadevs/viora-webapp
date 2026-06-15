/**
 * @file yield-forecast.assembler.ts
 * @description specialized assembler for mapping Yield Forecast resources to domain entities.
 */
import { YieldForecast } from '../domain/model/yield-forecast.entity';

import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { YieldForecastResource } from './yield-forecasts-response';
import { normalizeYieldRisk } from './status-normalizers';

export class YieldForecastAssembler extends BaseAssembler {
  /**
   * Transforms a single resource into an entity.
   * @param {Object} resource - Raw data point.
   * @returns {any}
   */
  static toEntityFromResource(resource: YieldForecastResource | null | undefined): YieldForecast {
    return new YieldForecast({
      id: resource?.id ?? null,
      plotId: resource?.plotId ?? null,
      tonnes: resource?.tonnes ?? 0,
      riskLevel: normalizeYieldRisk(resource?.riskLevel),
      description: resource?.description ?? '',
    });
  }

  /**
   * Transforms a collection of resources into entities.
   * @param {Object[]} resources - Array of raw data points.
   * @returns {any[]}
   */
  static toEntitiesFromResources(resources: YieldForecastResource[] = []): YieldForecast[] {
    return this.toEntities(resources, (resource) => this.toEntityFromResource(resource));
  }
}
