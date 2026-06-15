/**
 * @file overall-plot-health.assembler.ts
 * @description specialized assembler for mapping Overall Plot Health resources to domain entities.
 */
import {
  OverallPlotHealth,
  OverallPlotHealthStatus,
} from '../domain/model/overall-plot-health.entity';

import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { OverallPlotHealthResource } from './overall-plot-health-response';

export class OverallPlotHealthAssembler extends BaseAssembler {
  /**
   * Transforms a single resource into an entity.
   * @param {Object} resource - Raw data point.
   * @returns {any}
   */
  static toEntityFromResource(
    resource: OverallPlotHealthResource | null | undefined,
  ): OverallPlotHealth {
    return new OverallPlotHealth({
      status: this.toOverallPlotHealthStatus(resource?.status),
      healthyPlotsCount: resource?.healthyPlotsCount ?? 0,
      reviewPlotsCount: resource?.reviewPlotsCount ?? 0,
    });
  }

  /**
   * Transforms a collection of resources into entities.
   * @param {Object[]} resources - Array of raw data points.
   * @returns {any[]}
   */
  static toEntitiesFromResources(resources: OverallPlotHealthResource[] = []): OverallPlotHealth[] {
    return this.toEntities(resources, (resource) => this.toEntityFromResource(resource));
  }

  private static toOverallPlotHealthStatus(value: string | undefined): OverallPlotHealthStatus {
    const validStatuses: OverallPlotHealthStatus[] = [
      'Healthy',
      'Warning',
      'Moderate',
      'Critical',
    ];

    return validStatuses.includes(value as OverallPlotHealthStatus)
      ? (value as OverallPlotHealthStatus)
      : 'Healthy';
  }
}
