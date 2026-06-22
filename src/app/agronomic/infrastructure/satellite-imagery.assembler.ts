/**
 * @file satellite-imagery.assembler.ts
 * @description specialized assembler for mapping Satellite Imagery resources to domain entities.
 */
import { environment } from '../../../environments/environment';
import { SatelliteImagery } from '../domain/model/satellite-imagery.entity';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { SatelliteImageryResource } from './satellite-imagery-response';

export class SatelliteImageryAssembler extends BaseAssembler {
  /**
   * Transforms a single resource into an entity.
   * @param {Object} resource - Raw data point.
   * @returns {any}
   */
  static toEntityFromResource(
    resource: SatelliteImageryResource | null | undefined,
  ): SatelliteImagery {
    return new SatelliteImagery({
      id: resource?.id ?? null,
      plotId: resource?.plotId ?? null,
      tileUrl: this.absoluteTileUrl(resource?.tileUrl),
      captureDate: resource?.captureDate ?? '',
      ndviMean: resource?.ndviMean ?? 0,
      cloudPercentage: resource?.cloudPercentage ?? 0,
    });
  }

  /**
   * The backend serves NDVI tiles through a relative proxy path
   * (`/api/v1/plots/{id}/images?zoom={z}&x={x}&y={y}`). Mapbox raster sources need a
   * fully-qualified URL, so we resolve it against the platform API origin.
   */
  private static absoluteTileUrl(tileUrl: string | null | undefined): string {
    const url = tileUrl ?? '';

    if (!url || /^https?:\/\//i.test(url)) {
      return url;
    }

    try {
      const origin = new URL(environment.vioraPlatformApiUrl).origin;
      return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
    } catch {
      return url;
    }
  }

  /**
   * Transforms a collection of resources into entities.
   * @param {Object[]} resources - Array of raw data points.
   * @returns {any[]}
   */
  static toEntitiesFromResources(resources: SatelliteImageryResource[] = []): SatelliteImagery[] {
    return this.toEntities(resources, (resource) => this.toEntityFromResource(resource));
  }
}
