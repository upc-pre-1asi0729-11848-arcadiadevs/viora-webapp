/**
 * @file plot.assembler.ts
 * @description specialized assembler for mapping Plot resources to domain entities.
 */
import { Plot } from '../domain/model/plot.entity';

import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { PlotResource } from './plots-response';
import { SatelliteImageryAssembler } from './satellite-imagery.assembler';
import { normalizePhenologicalRisk, normalizePlotHealthStatus } from './status-normalizers';

export class PlotAssembler extends BaseAssembler {
  /**
   * Transforms a single resource into an entity.
   * @param {Object} resource - Raw data point.
   * @returns {any}
   */
  static toEntityFromResource(resource: PlotResource | null | undefined): Plot {
    const currentImagery = resource?.currentImagery
      ? SatelliteImageryAssembler.toEntityFromResource(resource.currentImagery)
      : null;

    return new Plot({
      id: resource?.id ?? null,
      name: resource?.name ?? '',
      polygonCoordinates: resource?.polygonCoordinates ?? [],
      areaSize: resource?.areaSize ?? 0,
      lastUpdate: resource?.lastUpdate ?? '',
      currentImagery,
      healthStatus: normalizePlotHealthStatus(resource?.healthStatus),
      phenologicalRisk: normalizePhenologicalRisk(resource?.phenologicalRisk),
      cropType: resource?.cropType ?? '',
      variety: resource?.variety ?? '',
      location: resource?.location ?? '',
      campaign: resource?.campaign ?? '',
      notes: resource?.notes ?? '',
    });
  }

  /**
   * Transforms a collection of resources into entities.
   * @param {Object[]} resources - Array of raw data points.
   * @returns {any[]}
   */
  static toEntitiesFromResources(resources: PlotResource[] = []): Plot[] {
    return this.toEntities(resources, (resource) => this.toEntityFromResource(resource));
  }
}
